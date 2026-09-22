const { Op } = require('sequelize');
const db = require('../db');
const Room = require('../models/Room');
const RoomMember = require('../models/RoomMember');
const User = require('../models/User');
const SpaceInvitation = require('../models/SpaceInvitation');
const SpaceDetails = require('../models/SpaceDetails');

function publicUser(user) {
    return user ? { id: user.id, name: user.name, email: user.email } : null;
}

async function findUsersByTargets(memberUserIds = [], memberEmails = []) {
    const ids = [...new Set(memberUserIds.map(Number).filter(id => Number.isInteger(id) && id > 0))];
    const emails = [...new Set(memberEmails.map(value => String(value || '').trim().toLowerCase()).filter(Boolean))];

    const where = [];
    if (ids.length) where.push({ id: { [Op.in]: ids } });
    if (emails.length) where.push({ email: { [Op.in]: emails } });
    if (!where.length) return [];

    const users = await User.findAll({ where: { [Op.or]: where } });
    const unique = new Map(users.map(user => [Number(user.id), user]));
    return [...unique.values()];
}

exports.createSpace = async (req, res) => {
    const transaction = await db.transaction();
    try {
        const inviterId = Number(req.user.id);
        const name = String(req.body?.name || '').trim();
        const purpose = String(req.body?.purpose || '').trim();
        const memberUserIds = Array.isArray(req.body?.memberUserIds) ? req.body.memberUserIds : [];
        const memberEmails = Array.isArray(req.body?.memberEmails) ? req.body.memberEmails : [];

        if (!name) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'Space name is required' });
        }

        if (memberUserIds.length === 0 && memberEmails.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'Add at least one person to invite' });
        }

        const users = await findUsersByTargets(memberUserIds, memberEmails);
        const requestedEmails = [...new Set(memberEmails.map(value => String(value || '').trim().toLowerCase()).filter(Boolean))];
        const requestedIds = [...new Set(memberUserIds.map(Number).filter(id => Number.isInteger(id) && id > 0))];
        const foundEmails = new Set(users.map(user => String(user.email).toLowerCase()));
        const foundIds = new Set(users.map(user => Number(user.id)));

        const invalidEmails = requestedEmails.filter(email => !foundEmails.has(email));
        const invalidIds = requestedIds.filter(id => !foundIds.has(id));

        if (invalidEmails.length || invalidIds.length) {
            await transaction.rollback();
            const details = [
                invalidEmails.length ? `emails: ${invalidEmails.join(', ')}` : '',
                invalidIds.length ? `user IDs: ${invalidIds.join(', ')}` : ''
            ].filter(Boolean).join('; ');
            return res.status(400).json({ success: false, message: `Some invitees were not found (${details})` });
        }

        const invitees = users.filter(user => Number(user.id) !== inviterId);
        if (!invitees.length) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'Choose at least one other user' });
        }

        const room = await Room.create({
            type: 'group',
            name,
            createdBy: inviterId
        }, { transaction });

        await SpaceDetails.create({ roomId: room.id, purpose: purpose || null }, { transaction });

        await RoomMember.create({ roomId: room.id, userId: inviterId }, { transaction });

        for (const invitee of invitees) {
            await SpaceInvitation.create({
                roomId: room.id,
                inviterId,
                inviteeId: invitee.id,
                status: 'pending'
            }, { transaction });
        }

        await transaction.commit();

        const io = req.app.get('io');
        if (io) {
            for (const invitee of invitees) {
                io.to(`user:${invitee.id}`).emit('space:invitation', {
                    roomId: room.id,
                    spaceName: room.name,
                    invitation: {
                        id: null,
                        inviter: publicUser(req.user)
                    }
                });
            }
        }

        return res.status(201).json({
            success: true,
            message: `Space created. ${invitees.length} invitation${invitees.length === 1 ? '' : 's'} sent.`,
            room: { id: room.id, type: room.type, name: room.name, purpose: purpose || null },
            invitedUsers: invitees.map(publicUser)
        });
    } catch (err) {
        if (!transaction.finished) await transaction.rollback();
        console.error('Create space error:', err.message);
        return res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.getInvitations = async (req, res) => {
    try {
        const inviteeId = Number(req.user.id);
        const invitations = await SpaceInvitation.findAll({
            where: { inviteeId, status: 'pending' },
            include: [
                { model: Room, attributes: ['id', 'name', 'type'] },
                { model: User, as: 'Inviter', attributes: ['id', 'name', 'email'] }
            ],
            order: [['createdAt', 'DESC']]
        });

        return res.json({
            success: true,
            invitations: invitations.map(invitation => ({
                id: invitation.id,
                room: invitation.Room,
                inviter: publicUser(invitation.Inviter),
                createdAt: invitation.createdAt
            }))
        });
    } catch (err) {
        console.error('Space invitations error:', err.message);
        return res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.getSentInvitations = async (req, res) => {
    try {
        const inviterId = Number(req.user.id);
        const memberships = await RoomMember.findAll({
            where: { userId: inviterId },
            attributes: ['roomId']
        });
        const memberRoomIds = memberships.map(membership => membership.roomId);
        if (!memberRoomIds.length) {
            return res.json({ success: true, invitations: [] });
        }

        const invitations = await SpaceInvitation.findAll({
            where: { inviterId, roomId: { [Op.in]: memberRoomIds } },
            include: [
                {
                    model: Room,
                    attributes: ['id', 'name', 'type', 'createdBy'],
                    include: [{ model: SpaceDetails, attributes: ['purpose'] }]
                },
                { model: User, as: 'Invitee', attributes: ['id', 'name', 'email'] }
            ],
            order: [['createdAt', 'DESC']]
        });

        const rows = await Promise.all(invitations.map(async invitation => {
            const membership = await RoomMember.findOne({
                where: { roomId: invitation.roomId, userId: invitation.inviteeId }
            });
            let status = invitation.status;
            if (invitation.status === 'accepted' && !membership) status = 'left';
            return {
                id: invitation.id,
                room: invitation.Room,
                invitee: publicUser(invitation.Invitee),
                status,
                createdAt: invitation.createdAt
            };
        }));

        return res.json({ success: true, invitations: rows });
    } catch (err) {
        console.error('Sent Space invitations error:', err.message);
        return res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.getSpaceInfo = async (req, res) => {
    try {
        const userId = Number(req.user.id);
        const roomId = Number(req.params.roomId);
        const room = await Room.findByPk(roomId, {
            include: [{ model: SpaceDetails, attributes: ['purpose'] }]
        });

        if (!room || room.type !== 'group') {
            return res.status(404).json({ success: false, message: 'Space not found' });
        }

        const membership = await RoomMember.findOne({ where: { roomId, userId } });
        if (!membership) {
            return res.status(403).json({ success: false, message: 'You are not a member of this Space' });
        }

        const members = await RoomMember.findAll({
            where: { roomId },
            include: [{ model: User, attributes: ['id', 'name', 'email'] }],
            order: [['createdAt', 'ASC']]
        });

        const result = {
            id: room.id,
            name: room.name,
            purpose: room.SpaceDetail ? room.SpaceDetail.purpose : null,
            createdBy: room.createdBy,
            isCreator: Number(room.createdBy) === userId,
            members: members.map(member => publicUser(member.User))
        };

        if (result.isCreator) {
            const pending = await SpaceInvitation.findAll({
                where: { roomId, status: 'pending' },
                include: [{ model: User, as: 'Invitee', attributes: ['id', 'name', 'email'] }],
                order: [['createdAt', 'DESC']]
            });
            result.pendingInvitations = pending.map(invitation => ({
                id: invitation.id,
                invitee: publicUser(invitation.Invitee),
                createdAt: invitation.createdAt
            }));
        }

        return res.json({ success: true, space: result });
    } catch (err) {
        console.error('Space info error:', err.message);
        return res.status(500).json({ success: false, message: 'Server Error' });
    }
};

async function respondToInvitation(req, res, status) {
    const transaction = await db.transaction();
    try {
        const inviteeId = Number(req.user.id);
        const invitation = await SpaceInvitation.findByPk(req.params.invitationId, { transaction, lock: transaction.LOCK.UPDATE });

        if (!invitation || invitation.status !== 'pending' || Number(invitation.inviteeId) !== inviteeId) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'Space invitation not found' });
        }

        if (status === 'accepted') {
            const existingMembership = await RoomMember.findOne({
                where: { roomId: invitation.roomId, userId: inviteeId },
                transaction
            });
            if (!existingMembership) {
                await RoomMember.create({ roomId: invitation.roomId, userId: inviteeId }, { transaction });
            }
        }

        invitation.status = status;
        await invitation.save({ transaction });
        await transaction.commit();

        const io = req.app.get('io');
        if (io) {
            io.to(`user:${invitation.inviterId}`).emit(
                status === 'accepted' ? 'space:invitationAccepted' : 'space:invitationRejected',
                {
                    roomId: invitation.roomId,
                    invitationId: invitation.id,
                    userId: inviteeId,
                    user: publicUser(req.user)
                }
            );
        }

        return res.json({ success: true, status, roomId: invitation.roomId });
    } catch (err) {
        if (!transaction.finished) await transaction.rollback();
        console.error(`Space invitation ${status} error:`, err.message);
        return res.status(500).json({ success: false, message: 'Server Error' });
    }
}

exports.acceptInvitation = (req, res) => respondToInvitation(req, res, 'accepted');
exports.rejectInvitation = (req, res) => respondToInvitation(req, res, 'rejected');

exports.leaveSpace = async (req, res) => {
    try {
        const userId = Number(req.user.id);
        const roomId = Number(req.params.roomId);
        const room = await Room.findByPk(roomId);

        if (!room || room.type !== 'group') {
            return res.status(404).json({ success: false, message: 'Space not found' });
        }

        const membership = await RoomMember.findOne({ where: { roomId, userId } });
        if (!membership) {
            return res.status(403).json({ success: false, message: 'You are not a member of this Space' });
        }

        await membership.destroy();

        const io = req.app.get('io');
        if (io) {
            io.to(String(roomId)).emit('space:memberLeft', { roomId, userId });
            io.in(`user:${userId}`).socketsLeave(String(roomId));
            io.to(`user:${userId}`).emit('space:left', { roomId });
        }

        return res.json({ success: true, message: 'You left the Space' });
    } catch (err) {
        console.error('Leave space error:', err.message);
        return res.status(500).json({ success: false, message: 'Server Error' });
    }
};

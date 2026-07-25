const BASE_URL = "http://localhost:3000";

const form = document.getElementById("signupForm");

form.addEventListener("submit", signup);

async function signup(event){

    event.preventDefault();

    const user = {

        name:document.getElementById("name").value,

        email:document.getElementById("email").value,

        phone:document.getElementById("phone").value,

        password:document.getElementById("password").value

    };

    try{

        const response = await axios.post(

            `${BASE_URL}/user/signup`,
            user

        );

        alert("Signup Successful");

        window.location.href="login.html";

    }

    catch(error){

        console.log(error);

        alert("Signup Failed");

    }

}
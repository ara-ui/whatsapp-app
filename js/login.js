const BASE_URL = "http://localhost:3000";

const form = document.getElementById("loginForm");

form.addEventListener("submit", login);

async function login(event){

    event.preventDefault();

    const loginData={

        emailOrPhone:document.getElementById("identifier").value,

        password:document.getElementById("password").value

    };

    try{

        const response=await axios.post(

            `${BASE_URL}/user/login`,
            loginData

        );

        alert("Login Successful");

        console.log(response.data);

        localStorage.setItem(

            "token",

            response.data.token

        );

        window.location.href="home.html";

    }

    catch(error){

        console.log(error);

        alert("Invalid Credentials");

    }

}
const express = require("express");
const app = express();
app.use(express.json());

const path = require("path");
const dbPath = path.join(__dirname, "userData.db");

const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const bcrypt = require("bcrypt");

let db = null;

// Initialization
const initializeDBAndServer = async() => {
    try {
        db = await open ({
            filename: dbPath,
            driver: sqlite3.Database,
        });
        app.listen(3000, () => {
            console.log("Server Running at http://localhost:3000");
        });
    } catch(e) {
        console.log(`DBError: ${ e.message }`);
        process.exit(1);
    };
};

initializeDBAndServer();


// Register User API
app.post("/register", async(request, response) => {
    const { username, name, password, gender, location } = request.body;
    
    const hashedPassword = await bcrypt.hash(password, 10);

    const selectUserQuery = `
    SELECT
      *
    FROM
      user
    WHERE
      username = '${ username }';`;

    const dbUser = await db.get(selectUserQuery);

    if (dbUser !== undefined) {
        response.status(400);
        response.send("User already exists");
    } else if(password.length < 5) {
        response.status(400);
        response.send("Password is too short");
    } else {
        const createUserQuery = `
        INSERT INTO
          user( username, name, password, gender, location )
        VALUES
          ('${username}', '${name}', '${hashedPassword}', '${gender}', '${location}');`;

        await db.run(createUserQuery);
        response.send("User created successfully");
    };
});

// Login User API
app.post("/login", async(request, response) => {
    const { username, password } = request.body;

    const selectUserQuery = `
    SELECT
      *
    FROM
      user
    WHERE
      username = '${ username }';`;

    const dbUser = await db.get(selectUserQuery);

    if (dbUser === undefined) {
        response.status(400);
        response.send("Invalid user");
    } else {
        const passwordMatched = await bcrypt.compare(password, dbUser.password);

        if (passwordMatched === true) {
            response.send("Login success!");
        } else {
            response.status(400);
            response.send("Invalid password");
        };
    };
});


// Change Password API
app.put("/change-password", async(request, response) => {
    const { username, oldPassword, newPassword } = request.body;

    const selectUserQuery = `
    SELECT
      *
    FROM
      user
    WHERE
      username = '${ username }';`;

    const dbUser = await db.get(selectUserQuery);

    if (newPassword.length < 5) {
        response.status(400);
        response.send("Password is too short");
    } else {
        try {
            const isPasswordMatched = await bcrypt.compare(oldPassword, dbUser.password);

            if (isPasswordMatched === true) {
                const hashedPassword = await bcrypt.hash(newPassword, 10);

                const updatePasswordQuery = `
                UPDATE
                  user
                SET
                  password = '${hashedPassword}'
                WHERE
                  username = '${username}';`;
                
                await db.run(updatePasswordQuery);
                response.send("Password updated");
            } else {
                response.status(400);
                response.send("Invalid current password");
            };
         } catch (e) {
             console.log(`DBError: ${e.message}`);  
         };
    };
});



module.exports = app;
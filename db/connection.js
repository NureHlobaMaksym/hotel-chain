import mysql2 from "mysql2";

const connection = mysql2.createConnection({
    host: 'localhost',
    port: 3306,
    database: 'hotel_chain',
    user: 'root',
    password: '',
    multipleStatements: true
});

connection.connect(function (err) {
    if (err) {
        console.log("error occurred while connecting" + err);
    } else {
        console.log("connection created with mysql successfully");
    }
});

function runDBCommand(sqlQuery, params = []) {
    return new Promise((resolve, reject) => {
        connection.query(sqlQuery, params, (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
}

export default runDBCommand;
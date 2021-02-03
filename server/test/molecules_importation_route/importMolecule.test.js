import fs from "fs";
import path from "path";

import chai from "chai";
import chaiHttp from "chai-http";
import mocha from "mocha";

import { queryPromise } from "../../db/database.js";
import app from "../../index.js";
import { forceTruncateTables, insertData, requestAPI } from "../index.test.js";

const { expect } = chai;
const { describe, it, before } = mocha;
chai.use(chaiHttp);
const __dirname = path.resolve("test", "molecules_importation_route");

describe("Import molecule", () => {
  let mytoken;
  before("Insert users data & get token", (done) => {
    forceTruncateTables("user").then(() =>
      insertData("users.sql").then(async () => {
        const res = await requestAPI("users/login", {
          body: { userPseudo: "fpoguet", userPassword: "1234" },
          method: "post",
        });
        mytoken = res.body.token;

        done();
      })
    );
  });

  it("Can upload file", async () => {
    const res = await uploadFile("molecules.csv", "false", mytoken);
    expect(res.status).equals(202);
    expect(res.body).to.haveOwnProperty("message");
    expect(res.body.imported).to.false;
    expect(res.body.errors).to.undefined;
    expect(res.body.warnings).to.not.undefined;
    res.body.warnings.forEach((warning) => expect(warning).to.haveOwnProperty("message"));
  });

  it("Upload files and get the last", async () => {
    let res = await uploadFile("molecules.csv", "true", mytoken);
    expect(res.status).equals(201);
    expect(res.body.imported).to.be.true;

    res = await uploadFile("little_sample.csv", "true", mytoken);
    expect(res.status).equals(201);
    expect(res.body.imported).to.be.true;
    const size = getFileSize("little_sample.csv");

    let countMolecules = await queryPromise("SELECT COUNT(*) as count FROM molecule");
    expect(countMolecules[0].count).equals(11);

    res = await requestAPI("import/molecules", { method: "get", token: mytoken });

    res = await new Promise((resolve) =>
      chai
        .request(app)
        .get(res.body.shortpath)
        .set("Authorization", "Barear " + mytoken)
        .end((_, res) => {
          resolve(res);
        })
    );

    expect(res.status).equals(200);
    expect(Number(res.headers["content-length"])).to.be.equals(size);
  });

  it("Import bad files", async () => {
    let res = await uploadFile("bad.csv", false, mytoken);

    expect(res.status).equals(400);

    expect(res.body.errors).to.have.length.greaterThan(0);
    expect(res.body.imported).to.be.false;

    res = await uploadFile("bad.csv", true, mytoken);

    expect(res.status).equals(400);

    expect(res.body.errors).to.have.length.greaterThan(0);
    res.body.errors.forEach((error) => expect(error).to.haveOwnProperty("message"));
    expect(res.body.imported).to.be.false;
  });

  it("Can't access file without being logged", async () => {
    await uploadFile("molecules.csv", "true", mytoken);
    let res = await requestAPI("import/molecules", { method: "get", token: mytoken });

    res = await new Promise((resolve) =>
      chai
        .request(app)
        .get(res.body.shortpath)
        .end((_, res) => {
          resolve(res);
        })
    );

    expect(res.status).equals(401);
  });

  it("Missing file", async () => {
    let res = await new Promise((resolve, reject) => {
      chai
        .request(app)
        .post("/api/v1/import/molecules")
        .set("Authorization", "Bearer " + mytoken)
        .set("Content-Type", "text/csv")
        .field("confirmed", "true")
        .end(async (err, res) => {
          if (err) {
            return reject(err);
          }
          resolve(res);
        });
    });
    expect(res.status).equals(400);
  });

  it("Bad format file", async () => {
    const res = await uploadFile("molecules.xlsx", true, mytoken);
    expect(res.status).equals(400);
  });

  it("Fake csv file", async () => {
    const res = await uploadFile("molecules_false.csv", true, mytoken);
    expect(res.status).equals(400);
  });
});

/**
 * Get a file
 * @param {string} filename
 * @returns {Buffer} The file
 */
function getFile(filename) {
  return fs.readFileSync(`${__dirname}/files/${filename}`);
}

/**
 * Make a request with a file
 * @param {string} filename The file name
 * @param {boolean} confirmed Tell if the request is confirmed
 * @param {string} token The token
 * @returns {Promise}
 */
function uploadFile(filename, confirmed, token = "") {
  return new Promise((resolve, reject) => {
    chai
      .request(app)
      .post("/api/v1/import/molecules")
      .set("Authorization", token ? "Bearer " + token : "")
      .set("Content-Type", "text/csv")
      .field("confirmed", confirmed)
      .attach("file", getFile(filename), filename)
      .end(async (err, res) => {
        if (err) {
          return reject(err);
        }
        resolve(res);
      });
  });
}

/**
 * Get a file size
 * @param {string} filename The filename
 * @returns {number} The size
 */
function getFileSize(filename) {
  return fs.statSync(`${__dirname}/files/${filename}`).size;
}

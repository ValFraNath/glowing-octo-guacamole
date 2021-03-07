import chai from "chai";
import chaiHttp from "chai-http";
import jwt from "jsonwebtoken";
import sinon from "sinon";

import app from "../index.js";

import { forceTruncateTables, insertData, requestAPI } from "./index.test.js";

chai.use(chaiHttp);
const { expect } = chai;
describe("User test", function () {
  function decodeRefreshToken(refreshToken) {
    const { REFRESH_TOKEN_KEY } = process.env;
    const { user, admin } = jwt.verify(refreshToken, REFRESH_TOKEN_KEY);
    return { user, admin };
  }

  function decodeAccessToken(accessToken) {
    const { ACCESS_TOKEN_KEY } = process.env;
    const { user, admin } = jwt.verify(accessToken, ACCESS_TOKEN_KEY);
    return { user, admin };
  }

  before("Insert users data", async function () {
    this.timeout(10000);
    await forceTruncateTables("user");
    await insertData("users.sql");
  });

  describe("User login", function () {
    it("Good user", async function () {
      const res = await requestAPI("users/login", {
        body: {
          userPseudo: "fpoguet",
          userPassword: "1234",
        },
        method: "post",
      });

      expect(res.status, res.error).to.be.equal(200);
      expect(res.body).to.haveOwnProperty("user");
      expect(res.body).to.haveOwnProperty("accessToken");
      expect(res.body).to.haveOwnProperty("refreshToken");

      expect(res.body.user).equal("fpoguet");
      expect(res.body.admin).false;

      expect(decodeRefreshToken(res.body.refreshToken)).deep.equal({
        user: "fpoguet",
        admin: false,
      });

      expect(decodeAccessToken(res.body.accessToken)).deep.equal({
        user: "fpoguet",
        admin: false,
      });
    });

    it("Admin user", async () => {
      const res = await requestAPI("users/login", {
        body: {
          userPseudo: "fdadeau",
          userPassword: "1234",
        },
        method: "post",
      });

      expect(res.body.admin).true;

      expect(decodeRefreshToken(res.body.refreshToken)).deep.equal({
        user: "fdadeau",
        admin: true,
      });

      expect(decodeAccessToken(res.body.accessToken)).deep.equal({
        user: "fdadeau",
        admin: true,
      });
    });

    it("User does not exist", async function () {
      const res = await requestAPI("users/login", {
        body: {
          userPseudo: "noexist",
          userPassword: "1234",
        },
        method: "post",
      });
      expect(res.status).to.be.equal(404);
    });

    it("Wrong password", async function () {
      const res = await requestAPI("users/login", {
        body: {
          userPseudo: "vperigno",
          userPassword: "134",
        },
        method: "post",
      });
      expect(res.status).to.be.equal(401);
    });

    it("Wrong body format", async function () {
      const res = await requestAPI("users/login", {
        body: {
          pseudo: "noexist",
          password: "1234",
        },
        method: "post",
      });
      expect(res.status).to.be.equal(400);
    });
  });

  describe("Use refresh and access tokens", async function () {
    const tokens = {};
    before("Get tokens", async function () {
      const {
        body: { accessToken, refreshToken },
      } = await requestAPI("users/login", {
        body: { userPseudo: "fpoguet", userPassword: "1234" },
        method: "post",
      });

      expect(refreshToken).not.undefined;
      expect(accessToken).not.undefined;

      tokens.refresh = refreshToken;
      tokens.access = accessToken;
    });

    it("Can generate access token", async () => {
      const res = await requestAPI("users/token", {
        body: { refreshToken: tokens.refresh },
        method: "post",
      });

      expect(res.status).equal(200);
      expect(res.body).haveOwnProperty("accessToken");

      expect(decodeAccessToken(res.body.accessToken)).deep.equal({
        user: "fpoguet",
        admin: false,
      });
    });

    it("Can logout", async () => {
      const res = await requestAPI("users/logout", {
        body: { refreshToken: tokens.refresh },
        method: "post",
        token: tokens.access,
      });

      expect(res.status).equal(200);
    });

    it("Can't generate new access token after logout", async () => {
      const res = await requestAPI("users/token", {
        body: { refreshToken: tokens.refresh },
        method: "post",
      });

      expect(res.status).equal(400);
    });

    it("Can't use an expired access token", async () => {
      const clock = sinon.useFakeTimers(Date.now() + 1000 * 60 * 11);

      const res = await requestAPI("users", { token: tokens.access });
      expect(res.status).equal(401);

      clock.restore();
    });
  });

  describe("Get data from several users", function () {
    let token;
    before(async function () {
      // Authenticate
      const res = await requestAPI("users/login", {
        body: {
          userPseudo: "fpoguet",
          userPassword: "1234",
        },
        method: "post",
      });
      expect(res.status).to.be.equal(200);
      expect(Object.keys(res.body)).to.contains("user");
      expect(Object.keys(res.body)).to.contains("accessToken");
      // eslint-disable-next-line prefer-destructuring
      token = res.body.accessToken;
    });

    it("All users exist", async function () {
      const res = await requestAPI("users", {
        token: token,
        body: ["nhoun", "fpoguet"],
        method: "post",
      });

      expect(res.status, res.error).to.be.equal(200);

      expect(Object.keys(res.body)).to.have.lengthOf(2);
      expect(Object.keys(res.body)).to.contains("nhoun");
      expect(Object.keys(res.body)).to.contains("fpoguet");

      const firstUser = res.body["nhoun"];
      expect(Object.keys(firstUser)).to.contains("pseudo");
      expect(firstUser.pseudo).to.be.equal("nhoun");
      expect(Object.keys(firstUser)).to.contains("defeats");
      expect(Object.keys(firstUser)).to.contains("victories");
      expect(Object.keys(firstUser)).to.contains("avatar");
    });

    it("Some users do not exist", async function () {
      const res = await requestAPI("users", {
        token: token,
        body: ["nhoun", "azerty"],
        method: "post",
      });

      expect(res.status, res.error).to.be.equal(200);

      expect(Object.keys(res.body)).to.have.lengthOf(1);
      expect(Object.keys(res.body)).to.contains("nhoun");

      const firstUser = res.body["nhoun"];
      expect(Object.keys(firstUser)).to.contains("pseudo");
      expect(firstUser.pseudo).to.be.equal("nhoun");
      expect(Object.keys(firstUser)).to.contains("defeats");
      expect(Object.keys(firstUser)).to.contains("victories");
      expect(Object.keys(firstUser)).to.contains("avatar");
    });

    it("Not logged in", async function () {
      const err = await requestAPI("users", {
        body: ["nhoun", "fpoguet"],
        method: "post",
      });
      expect(err.status).to.be.equal(401);
    });
  });

  describe("Get user informations", function () {
    let token;
    before(function (done) {
      // Authenticate
      chai
        .request(app)
        .post("/api/v1/users/login")
        .send({
          userPseudo: "fpoguet",
          userPassword: "1234",
        })
        .end((err, res) => {
          if (err) {
            throw err;
          }

          expect(res.status, res.error).to.be.equal(200);

          expect(Object.keys(res.body)).to.contains("user");
          expect(Object.keys(res.body)).to.contains("accessToken");
          token = "Bearer " + res.body.accessToken;

          done();
        });
    });

    it("Existing user", function (done) {
      chai
        .request(app)
        .get("/api/v1/users/vperigno")
        .set("Authorization", token)
        .end((err, res) => {
          if (err) {
            throw err;
          }
          expect(res.status, res.error).to.be.equal(200);

          expect(Object.keys(res.body)).to.contains("pseudo");
          expect(res.body.pseudo).to.be.equal("vperigno");
          expect(Object.keys(res.body)).to.contains("defeats");
          expect(Object.keys(res.body)).to.contains("victories");
          expect(Object.keys(res.body)).to.contains("avatar");
          done();
        });
    });

    it("User does not exist", function (done) {
      chai
        .request(app)
        .get("/api/v1/users/no-i-do-not-exist")
        .set("Authorization", token)
        .end((err, res) => {
          if (err) {
            throw err;
          }

          expect(res.status).to.be.equal(404);
          done();
        });
    });

    it("Not logged in", function (done) {
      chai
        .request(app)
        .get("/api/v1/users/fpoguet")
        // No Authorization header
        .end((err, res) => {
          if (err) {
            throw err;
          }
          expect(res.status, res.error).to.be.equal(401);
          done();
        });
    });

    it("Get my informations", function (done) {
      chai
        .request(app)
        .get("/api/v1/users/me")
        .set("Authorization", token)
        .end((err, res) => {
          if (err) {
            throw err;
          }
          expect(res.status, res.error).to.be.equal(200);

          expect(Object.keys(res.body)).to.contains("pseudo");
          expect(res.body.pseudo).to.be.equal("fpoguet");
          expect(Object.keys(res.body)).to.contains("defeats");
          expect(Object.keys(res.body)).to.contains("victories");
          expect(Object.keys(res.body)).to.contains("avatar");
          done();
        });
    });
  });

  describe("Update user informations", function () {
    let token;

    this.beforeAll(function (done) {
      // Authenticate
      chai
        .request(app)
        .post("/api/v1/users/login")
        .send({
          userPseudo: "fpoguet",
          userPassword: "1234",
        })
        .end((err, res) => {
          if (err) {
            throw err;
          }

          expect(res.status, res.error).to.be.equal(200);

          expect(Object.keys(res.body)).to.contains("user");
          expect(Object.keys(res.body)).to.contains("accessToken");
          token = "Bearer " + res.body.accessToken;

          done();
        });
    });

    it("Update nothing", function (done) {
      chai
        .request(app)
        .patch("/api/v1/users/me")
        .send({ pseudo: "fpoguet" })
        .set("Authorization", token)
        .end((err, res) => {
          if (err) {
            throw err;
          }
          expect(res.status, res.error).to.be.equal(400);
          done();
        });
    });

    it("Update bad avatar (not object)", function (done) {
      chai
        .request(app)
        .patch("/api/v1/users/fpoguet")
        .send({ avatar: "this-is-not-an-avatar" })
        .set("Authorization", token)
        .end((err, res) => {
          if (err) {
            throw err;
          }
          expect(res.status, res.error).to.be.equal(400);

          done();
        });
    });

    it("Update bad avatar (missing field)", function (done) {
      chai
        .request(app)
        .patch("/api/v1/users/fpoguet")
        .send({ avatar: { colorBG: "#ffffff", colorBody: "#dedede", eyes: 0, hands: 0, hat: 0 } }) // missing an information
        .set("Authorization", token)
        .end((err, res) => {
          if (err) {
            throw err;
          }
          expect(res.status, res.error).to.be.equal(400);

          done();
        });
    });

    it("Update bad avatar (integer is not an integer)", function (done) {
      chai
        .request(app)
        .patch("/api/v1/users/fpoguet")
        .send({
          avatar: {
            colorBG: "#ffffff",
            colorBody: "#dedede",
            eyes: 0,
            hands: 0,
            hat: 0,
            mouth: "this-is-not-an-int",
          },
        }) // missing an information
        .set("Authorization", token)
        .end((err, res) => {
          if (err) {
            throw err;
          }
          expect(res.status, res.error).to.be.equal(400);

          done();
        });
    });

    it("Update bad avatar (integer is not an integer but a string with an integer inside)", function (done) {
      chai
        .request(app)
        .patch("/api/v1/users/fpoguet")
        .send({
          avatar: {
            colorBG: "#ffffff",
            colorBody: "#dedede",
            eyes: 0,
            hands: 0,
            hat: 0,
            mouth: "0",
          },
        }) // missing an information
        .set("Authorization", token)
        .end((err, res) => {
          if (err) {
            throw err;
          }
          expect(res.status, res.error).to.be.equal(400);

          done();
        });
    });

    it("Update bad avatar (color is not a color)", function (done) {
      chai
        .request(app)
        .patch("/api/v1/users/fpoguet")
        .send({
          avatar: { colorBG: "#ffffff", colorBody: "#camion", eyes: 0, hands: 0, hat: 0, mouth: 0 },
        }) // missing an information
        .set("Authorization", token)
        .end((err, res) => {
          if (err) {
            throw err;
          }
          expect(res.status, res.error).to.be.equal(400);

          done();
        });
    });

    it("Update my avatar with /pseudo route", function (done) {
      chai
        .request(app)
        .patch("/api/v1/users/fpoguet")
        .send({
          avatar: { colorBG: "#ffffff", colorBody: "#dedede", eyes: 0, hands: 0, hat: 0, mouth: 0 },
        })
        .set("Authorization", token)
        .end((err, res) => {
          if (err) {
            throw err;
          }
          expect(res.status, res.error).to.be.equal(200);
          expect(Object.keys(res.body)).to.contains("pseudo");
          expect(res.body.pseudo).to.be.equal("fpoguet");
          expect(Object.keys(res.body)).to.contains("defeats");
          expect(Object.keys(res.body)).to.contains("victories");
          expect(Object.keys(res.body)).to.contains("avatar");
          expect(res.body.avatar).to.be.deep.equal({
            colorBG: "#ffffff",
            colorBody: "#dedede",
            eyes: 0,
            hands: 0,
            hat: 0,
            mouth: 0,
          });
          done();
        });
    });

    it("Update my avatar with /me route", function (done) {
      chai
        .request(app)
        .patch("/api/v1/users/me")
        .send({
          avatar: { colorBG: "#158233", colorBody: "#9F7F53", eyes: 0, hands: 0, hat: 0, mouth: 0 },
        })
        .set("Authorization", token)
        .end((err, res) => {
          if (err) {
            throw err;
          }
          expect(res.status, res.error).to.be.equal(200);
          expect(Object.keys(res.body)).to.contains("pseudo");
          expect(res.body.pseudo).to.be.equal("fpoguet");
          expect(Object.keys(res.body)).to.contains("defeats");
          expect(Object.keys(res.body)).to.contains("victories");
          expect(Object.keys(res.body)).to.contains("avatar");
          expect(res.body.avatar).to.be.deep.equal({
            colorBG: "#158233",
            colorBody: "#9F7F53",
            eyes: 0,
            hands: 0,
            hat: 0,
            mouth: 0,
          });
          done();
        });
    });

    it("Informations has been updated", function (done) {
      chai
        .request(app)
        .get("/api/v1/users/me")
        .set("Authorization", token)
        .end((err, res) => {
          if (err) {
            throw err;
          }
          expect(res.status, res.error).to.be.equal(200);

          expect(Object.keys(res.body)).to.contains("pseudo");
          expect(res.body.pseudo).to.be.equal("fpoguet");
          expect(Object.keys(res.body)).to.contains("defeats");
          expect(Object.keys(res.body)).to.contains("victories");
          expect(Object.keys(res.body)).to.contains("avatar");
          expect(res.body.avatar).to.be.deep.equal({
            colorBG: "#158233",
            colorBody: "#9F7F53",
            eyes: 0,
            hands: 0,
            hat: 0,
            mouth: 0,
          });
          done();
        });
    });
  });
});

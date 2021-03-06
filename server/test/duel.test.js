import fs from "fs/promises";

import path from "path";

import chai from "chai";
import chaiHttp from "chai-http";
import mocha from "mocha";

import { _initMockedDuelRounds } from "../controllers/duels.js";

import {
  forceTruncateTables,
  getToken,
  insertData,
  requestAPI,
  resetConfig,
} from "./index.test.js";

chai.use(chaiHttp);
const { expect } = chai;
const { before } = mocha;

const DEFAULT_CONFIG = {
  ROUNDS_PER_DUEL: 5,
  QUESTIONS_PER_ROUNDS: 5,
  QUESTION_TIMER_DURATION: 10,
};
// without data

describe("Duels", () => {
  let tokens;

  before("Get users tokens", (done) => {
    const users = ["vperigno", "nhoun", "fpoguet"];
    Promise.all(users.map((user) => getToken(user))).then((usersToken) => {
      tokens = usersToken.reduce((tokens, token, i) => {
        tokens[users[i]] = token;
        return tokens;
      }, Object.create(null));
      done();
    });
  });

  describe("Without data", () => {
    before("Clear data", function (done) {
      this.timeout(10000);
      forceTruncateTables("molecule", "duel", "results").then(done);
    });
    it("Not enough data", async () => {
      const error = await requestAPI("duels/new", {
        token: tokens.fpoguet,
        method: "post",
        body: { opponent: "nhoun" },
      });
      expect(error.status).equals(422);
      expect(error.body.code).equals("NED");
    });
  });

  describe("Default", () => {
    before("Clear duels & results", function (done) {
      this.timeout(10000);
      forceTruncateTables(
        "duel",
        "results",
        "user",
        "molecule",
        "property",
        "property_value",
        "molecule_property",
        "class",
        "system"
      ).then(() =>
        insertData("users.sql").then(() =>
          insertData("molecules.sql").then(() => resetConfig().then(() => done()))
        )
      );
    });

    describe("Error cases", () => {
      it("Can't create without be logged", async () => {
        const error = await requestAPI("duels/new", {
          method: "post",
          body: { opponent: "nhoun" },
        });

        expect(error.status).equals(401);
      });

      it("Can't create without opponent", async () => {
        const error = await requestAPI("duels/new", {
          token: tokens.fpoguet,
          method: "post",
        });

        expect(error.status).equals(400);
      });

      it("Can't create with invalid opponent", async () => {
        const error = await requestAPI("duels/new", {
          token: tokens.fpoguet,
          method: "post",
          body: { opponent: "b" },
        });

        expect(error.status).equals(404);
      });
    });

    describe("Well formed duel", () => {
      let duel;
      it("Can create", async () => {
        const res = await requestAPI("duels/new", {
          token: tokens.fpoguet,
          method: "post",
          body: { opponent: "vperigno" },
        });
        expect(res.status).equals(201);
        expect(res.body).haveOwnProperty("id");

        duel = (await requestAPI(`duels/${res.body.id}`, { token: tokens.vperigno })).body;
      }).timeout(5000);

      it("Good number of rounds & questions", (done) => {
        expect(duel.rounds).to.have.length(DEFAULT_CONFIG.ROUNDS_PER_DUEL);
        duel.rounds.forEach((round) =>
          expect(round).to.have.length(DEFAULT_CONFIG.QUESTIONS_PER_ROUNDS)
        );
        done();
      });

      it("Good questions types", (done) => {
        let types = duel.rounds.map((round) => round.map((question) => question.type));
        types = types.map((type) => [...new Set(type)]);
        types.forEach((type) => expect(type).to.have.length(1));
        types = [...new Set(types.map((type) => type[0]))];
        expect(types).to.have.length(DEFAULT_CONFIG.ROUNDS_PER_DUEL);
        done();
      });
    });

    describe("Mocked rounds", () => {
      const ids = [];

      before("Cleat duels", function (done) {
        this.timeout(10000);
        forceTruncateTables("duel", "results").then(done);
      });

      before("Use mocked rounds", async () => {
        const mock = await fs.readFile(path.resolve("test", "mocks", "rounds.mock.json"), {
          encoding: "utf8",
        });

        _initMockedDuelRounds(JSON.parse(mock));
      });

      before("Create against nath", async () => {
        const res = await requestAPI("duels/new", {
          token: tokens.fpoguet,
          method: "post",
          body: { opponent: "nhoun" },
        });
        ids[0] = res.body.id;
      });

      it("Can't create a duel with the same users at the same time", async () => {
        const res = await requestAPI("duels/new", {
          token: tokens.fpoguet,
          method: "post",
          body: { opponent: "nhoun" },
        });

        expect(res.status).equals(409);
        expect(res.body.id).equals(ids[0]);
      });

      before("Create against val", async () => {
        const res = await requestAPI("duels/new", {
          token: tokens.fpoguet,
          method: "post",
          body: { opponent: "vperigno" },
        });
        ids[1] = res.body.id;
      });

      it("Different ids", (done) => {
        expect(ids[0]).not.equals(ids[1]);
        done();
      });

      it("Get by creator", async () => {
        const duel = (await requestAPI("duels/" + ids[0], { token: tokens.fpoguet })).body;
        expect(duel.currentRound).equals(1);
        expect(duel.opponent).equals("nhoun");
        expect(duel.rounds).to.have.length(DEFAULT_CONFIG.ROUNDS_PER_DUEL);
        duel.rounds.forEach((round, i) =>
          round.forEach((question) => {
            expectHaveProperties(question, "title", "type");
            if (i === 0) {
              expectHaveProperties(question, "wording", "subject");
            } else {
              expectNotHaveProperties(question, "wording", "subject");
            }
          })
        );
        duel.rounds.forEach((round) =>
          expect(round).to.have.length(DEFAULT_CONFIG.QUESTIONS_PER_ROUNDS)
        );
      });

      it("Get by opponent", async () => {
        const duel = (await requestAPI("duels/" + ids[0], { token: tokens.nhoun })).body;
        expect(duel.currentRound).equals(1);
        expect(duel.opponent).equals("fpoguet");
        expect(duel.rounds).to.have.length(DEFAULT_CONFIG.ROUNDS_PER_DUEL);

        duel.rounds.forEach((round, i) =>
          round.forEach((question) => {
            expectHaveProperties(question, "title", "type");
            if (i === 0) {
              expectHaveProperties(question, "wording", "subject");
            } else {
              expectNotHaveProperties(question, "wording", "subject");
            }
          })
        );
        duel.rounds.forEach((round) =>
          expect(round).to.have.length(DEFAULT_CONFIG.QUESTIONS_PER_ROUNDS)
        );
      });

      it("Get by other user", async () => {
        const res = await requestAPI("duels/" + ids[0], { token: tokens.vperigno });
        expect(res.status).to.be.equals(404);
      });

      it("Get all duel : fpoguet", async () => {
        const duels = (await requestAPI("duels/", { token: tokens.fpoguet })).body;
        expect(duels).to.have.length(2);
      });

      it("Get all duel : vperigno", async () => {
        const duels = (await requestAPI("duels/", { token: tokens.vperigno })).body;
        expect(duels).to.have.length(1);
      });

      for (let i = 1; i <= DEFAULT_CONFIG.ROUNDS_PER_DUEL; ++i) {
        describe("Play : turn " + i, () => {
          it("Play : fpoguet", async () => {
            const duel = (
              await requestAPI(`duels/${ids[0]}/${i}`, {
                token: tokens.fpoguet,
                method: "post",
                body: { answers: [1, 3, 2, 0, 0] },
              })
            ).body;

            expect(Boolean(duel.inProgress)).to.be.true;
            expect(duel.currentRound).equals(i);

            if (i === 4) {
              expect(duel.userScore).equals(4);
              expect(duel.opponentScore).equals(2);
            }
          });

          it("Get duel : fpoguet", async () => {
            const duel = (
              await requestAPI(`duels/${ids[0]}`, {
                token: tokens.fpoguet,
              })
            ).body;

            duel.rounds.slice(0, i).forEach((round, i) =>
              round.forEach((question) => {
                expectHaveProperties(
                  question,
                  "title",
                  "type",
                  "subject",
                  "answers",
                  "userAnswer",
                  "goodAnswer"
                );
                if (i === duel.currentRound - 1) {
                  expectNotHaveProperties(question, "opponentAnswer");
                } else {
                  expectHaveProperties(question, "opponentAnswer");
                }
              })
            );
          });

          it("Get duel : nhoun", async () => {
            const duel = (
              await requestAPI(`duels/${ids[0]}`, {
                token: tokens.nhoun,
              })
            ).body;

            duel.rounds.slice(0, i).forEach((round, i) =>
              round.forEach((question) => {
                expectHaveProperties(question, "title", "type", "subject", "answers", "goodAnswer");
                if (i === duel.currentRound - 1) {
                  expectNotHaveProperties(question, "userAnswer", "opponentAnswer");
                } else {
                  expectHaveProperties(question, "userAnswer", "opponentAnswer");
                }
              })
            );
          });

          it("Play invalid round", async () => {
            const error = await requestAPI(`duels/${ids[0]}/${i + 2}`, {
              token: tokens.fpoguet,
              method: "post",
              body: { answers: [1, 3, 2, 0, 0] },
            });

            expect(error.status).equals(400);
          });

          it("Play invalid player", async () => {
            const error = await requestAPI(`duels/${ids[0]}/${i}`, {
              token: tokens.vperigno,
              method: "post",
              body: { answers: [2, 0, 2, 0, 1] },
            });

            expect(error.status).equals(404);
          });

          it("Play same round twice", async () => {
            const error = await requestAPI(`duels/${ids[0]}/${i}`, {
              token: tokens.fpoguet,
              method: "post",
              body: { answers: [2, 0, 2, 0, 1] },
            });

            expect(error.status).equals(400);
          });
          it("Play : nhoun", async () => {
            const duel = (
              await requestAPI(`duels/${ids[0]}/${i}`, {
                token: tokens.nhoun,
                method: "post",
                body: { answers: [2, 3, 1, 3, 0] },
              })
            ).body;

            if (i !== DEFAULT_CONFIG.ROUNDS_PER_DUEL) {
              expect(duel.currentRound).equals(i + 1);
              expect(Boolean(duel.inProgress)).to.be.true;
            }
          });

          it("Get duel after : nhoun", async () => {
            const duel = (
              await requestAPI(`duels/${ids[0]}`, {
                token: tokens.nhoun,
              })
            ).body;

            duel.rounds.slice(0, i).forEach((round) =>
              round.forEach((question) => {
                expectHaveProperties(
                  question,
                  "opponentAnswer",
                  "title",
                  "type",
                  "subject",
                  "answers",
                  "userAnswer",
                  "goodAnswer"
                );
              })
            );
          });

          it("Get duel after : fpoguet", async () => {
            const duel = (
              await requestAPI(`duels/${ids[0]}`, {
                token: tokens.fpoguet,
              })
            ).body;

            duel.rounds.slice(0, i).forEach((round) =>
              round.forEach((question) => {
                expectHaveProperties(
                  question,
                  "opponentAnswer",
                  "title",
                  "type",
                  "subject",
                  "answers",
                  "userAnswer",
                  "goodAnswer"
                );
              })
            );
          });
        });
      }

      describe("Finished duel", () => {
        it("Good results", async () => {
          const duel = (
            await requestAPI(`duels/${ids[0]}`, {
              token: tokens.fpoguet,
              method: "get",
            })
          ).body;

          expect(Boolean(duel.inProgress)).to.be.false;
          expect(duel.userScore).equals(8);
          expect(duel.opponentScore).equals(5);
        });

        it("Users stats updated", async () => {
          const fpoguet = (await requestAPI("users/fpoguet", { token: tokens.fpoguet })).body;
          expect(fpoguet.victories).equals(1);
          expect(fpoguet.defeats).equals(0);

          const nhoun = (await requestAPI("users/nhoun", { token: tokens.nhoun })).body;
          expect(nhoun.victories).equals(0);
          expect(nhoun.defeats).equals(1);
        });

        it("The answers are those expected", async () => {
          const duel = (
            await requestAPI(`duels/${ids[0]}`, {
              token: tokens.nhoun,
              method: "get",
            })
          ).body;

          duel.rounds.forEach((round) => {
            expect(round.map((question) => question.userAnswer)).to.be.deep.equal([2, 3, 1, 3, 0]);
          });

          duel.rounds.forEach((round) => {
            expect(round.map((question) => question.opponentAnswer)).to.be.deep.equal([
              1,
              3,
              2,
              0,
              0,
            ]);
          });
        });

        it("Can't play to a finished duel", async () => {
          const duel = await requestAPI(`duels/${ids[0]}/5`, {
            token: tokens.nhoun,
            method: "post",
            body: { answers: [2, 3, 1, 3, 0] },
          });

          expect(duel.status).equals(400);
        });

        it("Can create a duel with the same users after completing the last one", async () => {
          const res = await requestAPI("duels/new", {
            token: tokens.fpoguet,
            method: "post",
            body: { opponent: "nhoun" },
          });
          expect(res.status).equals(201);
        });
      });
    });
  });
});

function expectHaveProperties(o, ...properties) {
  properties.forEach((property) => expect(o).to.haveOwnProperty(property));
}
function expectNotHaveProperties(o, ...properties) {
  properties.forEach((property) => expect(o).to.not.haveOwnProperty(property));
}

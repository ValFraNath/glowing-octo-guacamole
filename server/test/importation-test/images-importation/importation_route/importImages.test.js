import fs from "fs";

import path from "path";

import Zip from "adm-zip";
import chai from "chai";
import chaiHttp from "chai-http";
import equalInAnyOrder from "deep-equal-in-any-order";

import { queryPromise } from "../../../../db/database.js";
import { createDir, deleteFiles } from "../../../../global/files.js";
import app from "../../../../index.js";
import {
  forceTruncateTables,
  getToken,
  insertData,
  requestAPI,
  importImagesViaAPI,
} from "../../../index.test.js";
import { uploadFile } from "../../molecules-importation/importation_route/importMolecule.test.js";

const { expect } = chai;
chai.use(chaiHttp);
chai.use(equalInAnyOrder);

const FILES_DIR = path.resolve(
  "test",
  "importation-test",
  "images-importation",
  "importation_route",
  "files"
);
const TMP_DIR = path.resolve("test", "tmp");

describe("Images importation", () => {
  let token;
  const tempFiles = [];

  before("Get token", function (done) {
    this.timeout(10000);
    forceTruncateTables("user").then(() =>
      insertData("users.sql").then(() =>
        getToken("fdadeau").then((t) => {
          token = t;
          done();
        })
      )
    );
  });

  before("Create tmp test directory", (done) => {
    createDir(TMP_DIR).then(() => done());
  });

  after("Delete temporary files", (done) => {
    deleteFiles(...tempFiles.map((f) => path.resolve(TMP_DIR, f))).then(() => done());
  });

  it("Can import (not confirmed)", async () => {
    const res = await importImagesViaAPI(path.resolve(FILES_DIR, "default"), false, token);
    expect(res.status).equals(202);
    expect(res.body.imported).to.be.false;
    expect(res.body.warnings).to.have.length(0);
  });

  it("Can import (not confirmed with warnings)", async () => {
    const res = await importImagesViaAPI(path.resolve(FILES_DIR, "warnings"), false, token);
    expect(res.status).equals(202);
    expect(res.body.imported).to.be.false;
    expect(res.body.warnings).to.have.length(5);
  });

  it("Can import (confirmed)", async () => {
    const res = await importImagesViaAPI(path.resolve(FILES_DIR, "default"), "true", token);
    expect(res.status).equals(201);
    expect(res.body.imported).to.be.true;
  });

  it("Can import (confirmed twice)", async () => {
    const res = await importImagesViaAPI(path.resolve(FILES_DIR, "warnings"), "true", token);
    expect(res.status).equals(201);
    expect(res.body.imported).to.be.true;
  });

  it("Can get the archive", async () => {
    let res = await requestAPI("/import/images", { token, method: "get" });
    expect(res.status).equals(200);
    const { shortpath } = res.body;

    res = await new Promise((resolve) =>
      chai
        .request(app)
        .get(shortpath)
        .set("Authorization", "Barear " + token)
        .end((_, res) => {
          resolve(res);
        })
    );

    expect(res.status).equals(200);

    const archiveName = "images.zip";
    tempFiles.push(archiveName);
    res = await downloadZipArchive(shortpath, token, archiveName);

    const archive = new Zip(path.resolve(TMP_DIR, archiveName));
    const images = archive.getEntries().map((e) => e.entryName);
    expect(images).to.have.length(3);
    expect(images).deep.equalInAnyOrder(["daclatasvir.png", "doravirine.png", "dolutegravir.svg"]);
  });

  it("Can download images", async () => {
    const res = await requestAPI("files/images/daclatasvir.png");
    expect(res.status).equals(200);
  });

  it("Images binded in database", async () => {
    const moleculesHavingImage = (
      await queryPromise("SELECT mo_dci, mo_image FROM molecule WHERE mo_image IS NOT NULL;")
    ).map((row) => ({ dci: row.mo_dci, image: row.mo_image }));

    expect(moleculesHavingImage).to.have.length(3);
    expect(moleculesHavingImage).to.be.deep.equalInAnyOrder([
      { dci: "DACLATASVIR", image: "daclatasvir.png" },
      { dci: "DORAVIRINE", image: "doravirine.png" },
      { dci: "DOLUTEGRAVIR", image: "dolutegravir.svg" },
    ]);
  });

  it("Images still binded in database after importing new molecules", async () => {
    await uploadFile("molecules.csv", "true", token, FILES_DIR);

    const moleculesHavingImage = (
      await queryPromise("SELECT mo_dci, mo_image FROM molecule WHERE mo_image IS NOT NULL;")
    ).map((row) => ({ dci: row.mo_dci, image: row.mo_image }));

    expect(moleculesHavingImage).to.have.length(2);
    expect(moleculesHavingImage).to.be.deep.equalInAnyOrder([
      { dci: "DACLATASVIR", image: "daclatasvir.png" },
      { dci: "DOLUTEGRAVIR", image: "dolutegravir.svg" },
    ]);
  });
});

/**
 * Download the images archive and save it in the tmp directory
 * @param {string} shortpath The file path in the server
 * @param {string} token The user token
 * @param {string} output The archive name
 * @returns {Promise<strings>} The archive path
 */
function downloadZipArchive(shortpath, token, output) {
  return new Promise((resolve) =>
    chai
      .request(app)
      .get(shortpath)
      .set("Content-Type", "application/x-www-form-urlencoded")
      .set("Authorization", "Barear " + token)
      .pipe(fs.createWriteStream(path.resolve(TMP_DIR, output)))
      .on("close", () => resolve())
  );
}

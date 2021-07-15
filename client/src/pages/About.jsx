import preval from "preval.macro";
import React from "react";

const About = () => {
  const dateTimeStamp = preval`module.exports = new Date().toLocaleString();`;

  return (
    <main id="informations">
      <p>
        Apothiquiz est une application d'apprentissage réflexe à destination des étudiants en
        pharmacie de l'Université de Franche-Comté.
      </p>
      <p>
        Réalisée dans le cadre d'un projet tutoré de Licence 3 Informatique 2020-2021 et d'un stage
        de la même Licence.
      </p>
      <p>
        Application open-source, code disponible sur{" "}
        <a href="https://github.com/valFraNath/apothiquiz">GitHub.com/ValFraNath/Apothiquiz</a>
      </p>
      <p>
        En cas de remarque ou de conseil sur cette application, vous pouvez{" "}
        <a href="mailto:eros.alberola@edu.univ-fcomte.fr">nous écrire par mail</a> ou{" "}
        <a href="https://github.com/ValFraNath/apothiquiz/issues/new/">ouvrir un ticket</a>.
      </p>

      <details id="credits">
        <summary>Crédits</summary>
        <ol>
          <li>
            Réalisé par Éros Albérola, <a href="https://www.nathanaelhoun.fr">Nathanaël Houn</a>,{" "}
            <a href="https://francois.poguet.com">François Poguet</a> et{" "}
            <a href="https://valentin-perignon.fr">Valentin Perignon</a>.
          </li>
          <li>Supervisé par Anne-Laure Clairet, Frédéric Dadeau, et Marc Pudlo.</li>
          <li>Graphismes par Roxane Herbstmeyer.</li>
          <li>
            Icônes par{" "}
            <a href="https://icons.modulz.app/" target="_blank" rel="noreferrer">
              Modulz
            </a>
            .
          </li>
        </ol>
      </details>

      <table id="app-version">
        <tr>
          <td> Version : </td>
          <td>{process.env.REACT_APP_VERSION ?? "développement"}</td>
        </tr>
        {process.env.NODE_ENV !== "development" && (
          <tr>
            <td>Date de compilation : </td>
            <td>{dateTimeStamp}</td>
          </tr>
        )}
      </table>
    </main>
  );
};

export default About;

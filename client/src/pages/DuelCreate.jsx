import axios from "axios";
import { PropTypes } from "prop-types";
import React, { useState } from "react";
import { useQuery, useQueryClient } from "react-query";

import Avatar from "../components/Avatar";
import ButtonFullWidth from "../components/buttons/ButtonFullWidth";
import FloatingError from "../components/status/FloatingError";
import Loading from "../components/status/Loading";
import PageError from "../components/status/PageError";

const DuelCreate = ({ history }) => {
  const [searchRegex, setSearchRegex] = useState(null);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState(null);
  const [error, setError] = useState(null);
  const queryClient = useQueryClient();

  const { data: listOfUsers, isSuccess, isError } = useQuery(["users", "challengeable"]);

  const [system, setSystem] = useState("Tout");
  const [difficulty, setDifficulty] = useState("EASY");

  const changeSystem = (event) => setSystem(event.target.value);
  const changeDifficulty = (event) => setDifficulty(event.target.value);

  const systems = [
    "Tout",
    "ANTIINFECTIEUX",
    "Cardio-vasculaire",
    "Douleurs-inflammation",
    "endocrinologie et diabète",
    "hémostase",
    "urologie",
    "Système respiratoire",
  ];

  if (isError) {
    return <PageError message="Erreur lors du chargement de la page" />;
  }

  if (!isSuccess) {
    return <Loading />;
  }

  function createDuel(opponent) {
    axios
      .post("/api/v1/duels/new", {
        opponent,
        system,
        difficulty,
      })
      .then(({ data: { id } }) => {
        queryClient.invalidateQueries(["users", "challengeable"]);
        history.push(`/duel/${id}`);
      })
      .catch((error) => {
        if (error.response.status === 409) {
          // Duels already exists => redirecting to it
          const { id } = error.response.data;
          queryClient.invalidateQueries(["users", "challengeable"]);
          history.push(`/duel/${id}`);
          return;
        }
        console.error(error);
        setError("Impossible de créer ce duel");
      });
  }

  return (
    <main id="create-duel">
      {error && <FloatingError message={error} />}
      <section>
        <h1>Créer un nouveau duel</h1>
        <input
          type="text"
          placeholder="Rechercher un utilisateur"
          onChange={(event) => {
            event.target.value === "" ? setSearch(null) : setSearch(true);
            setSelected(null);
            setSearchRegex(new RegExp(event.target.value, "y"));
          }}
        ></input>
      </section>

      <section>
        {search ? (
          <ul>
            {Object.keys(listOfUsers)
              .filter((pseudo) => !searchRegex || searchRegex.test(pseudo))
              .map((pseudo) => {
                const user = listOfUsers[pseudo];
                return (
                  <li
                    key={user.pseudo}
                    onClick={() => setSelected(user.pseudo)}
                    onDoubleClick={() => createDuel(user.pseudo)}
                    className={selected === user.pseudo ? "selected" : ""}
                  >
                    <Avatar size="50px" infos={user.avatar} />
                    <p>{user.pseudo}</p>
                  </li>
                );
              })}
          </ul>
        ) : (
          <></>
        )}
        <div id="filtres">
          <h2> Niveau des questions : </h2>
          <label>
            <input
              onChange={changeDifficulty}
              type="radio"
              name="difficulty"
              value="EASY"
              checked={true}
            />
            Débutant
          </label>
          <label>
            <input onChange={changeDifficulty} type="radio" name="difficulty" value="ALL" />
            Expert
          </label>
          <br />
          <br />

          <h2>Sélection des systèmes : </h2>
          <select onChange={changeSystem}>
            {systems.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
            ;
          </select>
        </div>
      </section>

      <section>
        {selected ? (
          <ButtonFullWidth onClick={() => createDuel(selected)}>Lancer le duel</ButtonFullWidth>
        ) : (
          <p>Veuillez choisir un adversaire</p>
        )}
      </section>
    </main>
  );
};

DuelCreate.propTypes = {
  history: PropTypes.object.isRequired,
};

export default DuelCreate;

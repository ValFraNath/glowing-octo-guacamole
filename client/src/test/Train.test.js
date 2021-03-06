import { expect } from "chai";
import { mount } from "enzyme";
import React from "react";
import { QueryClient, QueryClientProvider } from "react-query";

import Train from "../pages/Train";
const queryClient = new QueryClient();

describe("Train component", () => {
  let wrapper;
  let train;
  beforeEach(() => {
    wrapper = mount(
      <QueryClientProvider client={queryClient}>
        <Train />
      </QueryClientProvider>
    );
    train = wrapper.find(Train);
  });

  it("should display the introduction correctly", () => {
    expect(train.state("gameState")).to.be.equal(Train.STATE_INTRO);

    expect(wrapper.find("img")).to.have.lengthOf(1);
    expect(wrapper.find("h1")).to.have.lengthOf(1);
    expect(wrapper.find("button")).to.have.lengthOf(1);
  });

  it("should display the game correctly", () => {
    train.setState({
      gameState: Train.STATE_PLAY,
      question: {
        answers: ["IMIPENEME", "PRAZIQUANTEL", "OXYTETRACYCLINE", "MARAVIROC"],
        goodAnswer: 2,
        subject: "Décoloration dents",
        type: 6,
        wording: "Quelle molécule a comme effet indésirable « Décoloration dents » ?",
        timerDuration: 10,
      },
    });

    expect(wrapper.find("#quiz-topbar")).to.have.lengthOf(1);
    expect(wrapper.find("#quiz-question")).to.have.lengthOf(1);
    expect(wrapper.find("#timer")).to.have.lengthOf(1);
    expect(wrapper.find("#quiz-answers")).to.have.lengthOf(1);
  });

  it("should display the summary correctly", () => {
    train.setState({ gameState: Train.STATE_SUMMARY });

    expect(wrapper.find("h1")).to.have.lengthOf(1);
    expect(wrapper.find("p")).to.have.lengthOf(1);
    expect(wrapper.find("details")).to.have.lengthOf(1);
    expect(wrapper.find("ul")).to.have.lengthOf(2);
  });
});

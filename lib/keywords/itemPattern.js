import * as Schema from "../schema.js";
import * as Instance from "../instance.js";
import Validation from "./validation.js";
import { fromEpsilon, fromSchema, closure, zeroOrOne, oneOrMore, concat, union } from "../nfa.js";


const id = "https://json-schema.org/keyword/itemPattern";
const experimental = true;

const compile = async (schema, ast) => {
  const groups = [[]];
  let group = groups[0];

  for await (const rule of Schema.iter(schema)) {
    if (Schema.typeOf(rule, "string")) {
      const operator = Schema.value(rule);

      if (operator === "*") {
        group.push(closure(group.pop()));
      } else if (operator === "?") {
        group.push(zeroOrOne(group.pop()));
      } else if (operator === "+") {
        group.push(oneOrMore(group.pop()));
      } else if (operator === "|") {
        group = [];
        groups.push(group);
      } else {
        throw Error(`Unsupported pattern syntax: ${operator}`);
      }
    } else {
      const node = Schema.typeOf(rule, "array")
        ? compile(rule, ast)
        : fromSchema(await Validation.compile(rule, ast));
      group.push(await node);
    }
  }

  return Schema.length(schema) === 0 ? fromEpsilon() : groups
    .map((group) => group.reduce(concat))
    .reduce(union);
};

const interpret = (nfa, instance, ast, dynamicAnchors, quiet) => {
  if (!Instance.typeOf(instance, "array")) {
    return true;
  }

  let currentStates = [];
  addNextState(nfa.start, currentStates, []);

  for (const item of Instance.iter(instance)) {
    const nextStates = [];

    for (const state of currentStates) {
      const nextState = transition(state.transition, item, ast, dynamicAnchors, quiet);
      if (nextState) {
        addNextState(nextState, nextStates, []);
      }
    }

    currentStates = nextStates;
  }

  return Boolean(currentStates.find((s) => s.isEnd));
};

const addNextState = (state, nextStates, visited) => {
  if (state.epsilonTransitions.length) {
    for (const epsilonState of state.epsilonTransitions) {
      if (!visited.find((visited) => visited === epsilonState)) {
        visited.push(epsilonState);
        addNextState(epsilonState, nextStates, visited);
      }
    }
  } else {
    nextStates.push(state);
  }
};

const transition = (transitions, instance, ast, dynamicAnchors, quiet) => {
  for (const schema in transitions) {
    if (Validation.interpret(schema, instance, ast, dynamicAnchors, quiet)) {
      return transitions[schema];
    }
  }
};

export default { id, experimental, compile, interpret };
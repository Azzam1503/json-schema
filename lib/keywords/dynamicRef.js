import * as Browser from "@hyperjump/browser";
import { Validation } from "../experimental.js";


const id = "https://json-schema.org/keyword/dynamicRef";
const experimental = true;

const compile = async (schema, ast) => {
  const reference = Browser.value(schema);
  const self = await Browser.get(schema.document.baseUri, schema);
  await Validation.compile(self, ast);

  return reference;
};

const evaluate = (strategy) => (fragment, instance, ast, dynamicAnchors, quiet) => {
  if (!(fragment in dynamicAnchors)) {
    throw Error(`No dynamic anchor found for "${fragment}"`);
  }
  return strategy(dynamicAnchors[fragment], instance, ast, dynamicAnchors, quiet);
};

const interpret = evaluate(Validation.interpret);
const collectEvaluatedProperties = evaluate(Validation.collectEvaluatedProperties);
const collectEvaluatedItems = evaluate(Validation.collectEvaluatedItems);

export default { id, experimental, compile, interpret, collectEvaluatedProperties, collectEvaluatedItems };

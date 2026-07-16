// Importing a test module registers its tests on the shared harness.
import "./async/async.test";
import "./behavior/actions.test";
import "./behavior/behavior.test";
import "./movement/movement.test";

export { runAllTests } from "./harness";

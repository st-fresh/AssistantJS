import { RequestContext } from "../../../../src/components/root/interfaces";
import { extraction } from "../unifier/extraction";

const dummyCallback = () => console.log("You are only using a mock context, with no real request callback available.");
export function createContext(method = "POST", path = "/fitting_path", body = extraction, headers = {}, responseCallback = dummyCallback): RequestContext {
  return {
    method: method,
    path: path,
    body: body,
    headers: headers,
    responseCallback: responseCallback
  };
}

export const context = createContext();

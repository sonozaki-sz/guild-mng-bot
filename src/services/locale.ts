import { getTranslator } from "@hi18n/core";
import { book } from "../locale";
import config from "./config";

export const __t = getTranslator(book, config.locale).t;
import * as yaml from "js-yaml";
import * as fs from "fs";
import * as path from "path";
import { logError, logger, logInfo } from "./logger";

// Load ReportingConfig.yaml
export const loadConfig = (domain: string, version: string) => {
  logInfo({
    message: "Entering loadConfig function. Loading ReportingConfig.yaml...",
    meta: { domain, version },
  });
  try {
    const configPath = path.join(__dirname, "../config/ReportingConfig.yaml");
    const file = fs.readFileSync(configPath, "utf8");
    const yamlFile: any = yaml.load(file);

    const domainConfig = yamlFile?.domains?.[domain]?.versions?.[version];
    if (!domainConfig) {
      // logger.error(
      //   `Configuration for domain '${domain}' and version '${version}' not found.`
      // );
      logError({
        message: `Configuration for domain '${domain}' and version '${version}' not found.`,
        meta: { domain, version },
      });
      return;
    }
    logInfo({
      message: "Exiting loadConfig function. Loaded ReportingConfig.yaml.",
      meta: { domain, version, domainConfig },
    });
    return domainConfig;
  } catch (error) {
    // logger.error("Error loading flowConfig.yaml:", error);
    logError({
      message: "Error loading ReportingConfig.yaml",
      error,
      meta: { domain, version },
    });
    return null;
  }
};

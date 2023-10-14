const { existsSync, readFileSync, writeFileSync } = require("fs");
const { fileScanner } = require("./spinego");

function writeconfig(config) {
  // Convert the configuration to a string
  config = JSON.stringify(config, null, 2);
  // Write the configuration to the file
  writeFileSync("spinego.config", config);
}

function initconfiguration() {
  let config = {
    "spinego.options": {
      basedir: ".//",
      ignoredirs: [],
      ignorefiles: [],
      tzone: "Asia/Kolkata",
      domainName: "www.example.com",
      sitemap: "sitemap.xml",
      robotpath: "robots.txt",
      "file-preferences": {},
    },
  };
  writeconfig(config);
  console.log(`Configuration initiated successfully.
  \nNow you need to run "node spinego reinit-config"`);
}

function reinitConfiguration() {
  //base configuration template
  let config = {
    "spinego.options": {
      basedir: prevconfig.basedir,
      ignoredirs: prevconfig.ignoredirs,
      ignorefiles: prevconfig.ignorefiles,
      tzone: prevconfig.tzone,
      domainName: prevconfig.domainName,
      sitemap: prevconfig.sitemap,
      robotpath: prevconfig.robotpath,
      file_preferences: {},
    },
  };

  //making config for each file
  fileurls = fileScanner((basedir = "."))["fileurl"];
  fileurls.forEach((item) => {
    config["spinego.options"]["file_preferences"][item] = {
      changefreq: "",
      priority: "",
    };
  });
  writeconfig(config);
  console.log(
    `Configuration reinitiated.\nNow you can customize changefreq, priority for urls\nCustomize your options for best control`
  );
  console.log(`"node spinego run" to start using`);
}

//configuration loader
function loadConfiguration() {
  const config = "./spinego.config";
  if (existsSync(config)) {
    let data = readFileSync(config, "utf-8");
    if (data.length > 0) {
      return JSON.parse(data);
    } else {
      console.log("Configuration file is empty :(");
      initconfiguration();
      process.exit(1);
    }
  } else {
    console.log("Configuration file not exist :(");
    initconfiguration();
    process.exit(1);
  }
}

let prevconfig = loadConfiguration()?.["spinego.options"];
module.exports = {
  loadConfiguration,
  initconfiguration,
  reinitConfiguration,
};

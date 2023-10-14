module.exports = {
  fileScanner,
};
const {
  initconfiguration,
  reinitConfiguration,
  loadConfiguration,
} = require("./config");

const {
  readdirSync,
  statSync,
  existsSync,
  writeFile,
  readFile,
} = require("fs");

const { join, extname } = require("path");
const { DateTime } = require("luxon");

// Function to recursively scan a basedir and its subdirectories
function fileScanner(
  basedir,
  options = {},
  metadata = { fileurl: [], mtime: [] }
) {
  const {
    ignoredirs = prevconfig.ignoredirs,
    ignorefiles = prevconfig.ignorefiles,
    tzone = "Asia/Kolkata",
  } = options;
  //ignore node moudule files
  if (!ignoredirs.includes("node_modules")) {
    ignoredirs.push("node_modules");
  }

  readdirSync(basedir).forEach((item) => {
    const itemPath = join(basedir, item);

    //subdirectory crawling, if its subdir
    if (statSync(itemPath).isDirectory() && !ignoredirs.includes(item)) {
      // if item not in the exclusion list, recursively scan it
      fileScanner(
        itemPath,
        {
          ignoredirs: ignoredirs,
          ignorefiles: ignorefiles,
          tzone: tzone,
        },
        metadata
      );
    } else if (!ignorefiles.includes(item) && extname(itemPath) === ".html") {
      // If the item is a file, has a .html extension, and not in ignore list
      metadata["fileurl"].push(itemPath);
      metadata["mtime"].push(getModtime(itemPath, tzone));
    }
  });

  return metadata;
}

//modification time provider
function getModtime(fileurl, tzone) {
  const mtime = statSync(fileurl).mtime.getTime(); //it is epoch time
  return DateTime.fromMillis(mtime).setZone(tzone).toISO();
}

function urlOptimizer(domainName, url) {
  url = `https://${domainName}/${url.replace(/\\/g, "/")}`;
  //remove .html extension and replace index as /
  return url.slice(0, -5).replace("/index", "/");
}

function makeinXML(filesmeta, domainName, sitemap) {
  let content =
    `<?xml version='1.0' encoding='UTF-8'?>` +
    `<urlset ` +
    `xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ` +
    `xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 ` +
    `http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd" ` +
    `xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  const rooturl = `https://${domainName}/`;
  let cfreq, priority, url;
  for (let i = 0; i < filesmeta.fileurl.length; i++) {
    cfreq = filesmeta.changefreq[i];
    priority = filesmeta.priority[i];
    url = filesmeta.fileurl[i];
    content +=
      `<url>` +
      `<loc>${url}</loc>` +
      `<lastmod>${filesmeta.mtime[i]}</lastmod>` +
      `<changefreq>${cfreq ? cfreq : "hourly"}</changefreq>` +
      `<priority>${
        priority ? priority : rooturl === url ? "1.0" : "0.8"
      }</priority>` +
      `</url>`;
  }
  content += "</urlset>";

  //write content to xml file
  writeFile(sitemap, content, (err) => {
    if (err) {
      console.error("Error creating the file:", err);
    } else {
      console.log(`"${sitemap}" created successfully`);
    }
  });
}

function mkRobot(robotpath, sitemap, domainName) {
  content = `sitemap: https://${domainName}/${sitemap}\n`;
  if (existsSync(robotpath)) {
    readFile(robotpath, "utf8", (err, data) => {
      if (err) {
        console.error("Error reading the file:", err);
      } else if (!data.includes("sitemap:")) {
        // Prepend the new content to the existing content
        const combinedContent = content + data;
        writeFile(robotpath, combinedContent, (writeErr) => {
          if (writeErr) {
            console.error("Error prepending in existing robots.txt:", writeErr);
          } else {
            console.log(`sitemap was prepeneded in ${robotpath}`);
          }
        });
      } else {
        console.log("sitemap existing already in robots.txt");
      }
    });
  } else {
    writeFile(robotpath, content, (writeErr) => {
      if (writeErr) {
        console.error("Error creating robot:", writeErr);
      } else {
        console.log(`${robotpath} created and sitemap is included`);
      }
    });
  }
}

function filePreferencesloader(filesmetadata, file_preferences) {
  //add changefrequency and prority to meta data
  filesmetadata.changefreq = [];
  filesmetadata.priority = [];
  try {
    filesmetadata.fileurl.forEach((url) => {
      filesmetadata.changefreq.push(file_preferences[url].changefreq);
      filesmetadata.priority.push(file_preferences[url].priority);
    });
  } catch (error) {
    console.log(
      `Error raised :( \nRun "node spinego reinit-config" to fix this error`
    );
    process.exit(1);
  }
  return filesmetadata;
}

//main function
function sitemapGen(basedir, options = {}) {
  const {
    ignoredirs = [],
    ignorefiles = [],
    tzone = "",
    domainName = "",
    sitemap = "sitemap.xml",
    robotpath = "robots.txt",
    file_preferences = {},
  } = options;
  //Insisting domain name
  if (!domainName) {
    throw new Error("Domain name is required\t| Please configure in options");
  }

  //scan files and make metadata
  let filesmetadata = fileScanner(basedir, {
    ignoredirs: ignoredirs,
    ignorefiles: ignorefiles,
    tzone: tzone,
  });

  //loading file preference
  filesmetadata = filePreferencesloader(filesmetadata, file_preferences);

  //make seo friendly urls
  filesmetadata.fileurl = filesmetadata.fileurl.map((url) => {
    return urlOptimizer(domainName, url);
  });

  /* console.log(filesmetadata.fileurl); */
  console.log(`${filesmetadata.fileurl.length} number of pages detected`);

  makeinXML(filesmetadata, domainName, sitemap);
  mkRobot(robotpath, sitemap, domainName);
}

//command line arguments
let prevconfig = loadConfiguration()["spinego.options"];
const args = process.argv.slice(2);
if (args[0] === "reinit-config") {
  reinitConfiguration();
} else if (args[0] === "run") {
  sitemapGen(prevconfig.basedir, prevconfig);
} else if (args[0] === "init-config") {
  initconfiguration();
}

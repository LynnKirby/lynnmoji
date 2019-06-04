// SPDX-License-Identifier: CC0-1.0
// Written 2018 Lynn Kirby

const path = require("path");
const del = require("del");
const fs = require("fs-extra");
const globby = require("globby");
const gulp = require("gulp");
const imagemin = require("gulp-imagemin");
const imageminWebp = require("imagemin-webp");
const responsive = require("gulp-responsive");
const logger = require("gulplog");
const _ = require("lodash");

//******************************************************************************
// General configuration for our tasks.

const imageSizes = [16, 36, 72, 128];
const imageFormats = ["png", "webp"];

//******************************************************************************
// Task: clean

gulp.task("clean", async () => {
  await del("dist");
  logger.info(`clean: Deleted 'dist' directory`);
});

//******************************************************************************
// Task: build

gulp.task("build", () => {
  // Optimize SVG and copy to output directory.
  const svg = gulp
    .src("graphics/*.svg")
    .pipe(imagemin({ plugins: [imagemin.svgo()] }))
    .pipe(gulp.dest("dist"));

  // Convert optimized SVG to raster images.
  const config = [];

  for (const size of imageSizes) {
    for (const ext of imageFormats) {
      config.push({
        name: "*.svg",
        height: size,
        width: size,
        embed: true,
        background: "rgba(0, 0, 0, 0)",
        format: ext,
        rename: {
          suffix: `-${size}x${size}`,
        },
      });
    }
  }

  const raster = svg.pipe(responsive(config));

  // Optimize and copy raster images.
  return raster
    .pipe(
      imagemin({
        plugins: [
          imagemin.optipng({
            optimizationLevel: 7,
          }),
          imageminWebp({
            method: 6,
            lossless: true,
          }),
        ],
      }),
    )
    .pipe(gulp.dest("dist"));
});

//******************************************************************************
// Task: static

gulp.task("static", async () => {
  await fs.mkdirp("dist");
  await fs.copyFile("LICENSES/CC-BY-4.0", "dist/LICENSE");
  logger.info("static: Copied 'LICENSES/CC-BY-4.0' -> 'dist/LICENSE'");
});

//******************************************************************************
// Task: update-readme

gulp.task("update-readme", async () => {
  const filenames = (await globby("graphics/*.svg")).sort();
  const readme = await fs.readFile("README.md", { encoding: "utf8" });
  await fs.writeFile("README.old.md", readme);

  let preview = "<!-- PREVIEW SECTION START -->\n<table>\n";

  _.chunk(filenames, 4).forEach(row => {
    preview += "  <tr>\n";
    row.forEach(cell => {
      preview += "    <td>";
      preview += `<center><img src="${cell}" width="128" height="128">`;
      preview += `<h6><code>${path.parse(cell).name}</code></h6></center>`;
      preview += "</td>\n";
    });
    preview += "  </tr>\n";
  });

  preview += "</table>\n<!-- PREVIEW SECTION END -->";

  const updated = readme.replace(
    /<!-- PREVIEW SECTION START -->(.|\n)*<!-- PREVIEW SECTION END -->/,
    preview,
  );

  await fs.writeFile("README.md", updated);
});

//******************************************************************************
// Task: default

gulp.task(
  "default",
  gulp.series("clean", gulp.parallel("build", "static", "update-readme")),
);

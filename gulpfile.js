var gulp = require('gulp');
var watch = require("gulp-watch");
var browserSync = require('browser-sync').create();
var gulpnpmrun = require('gulp-npm-run');
var shell = require('gulp-shell');

gulp.task('browser-sync', function() {
    browserSync.init({
        proxy: "http://localhost:3456/",
        reloadDebounce: 5000
    });
});

gulpnpmrun(gulp, {
    exclude: ['test'],
    default: 'default',
    templates: 'notifications.json'
});

gulp.task("make", function () {
    gulp.watch(["server","public"], browserSync.reload)
});

gulp.task('default', ["make", 'browser-sync']);

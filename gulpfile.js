'use strict'

const gulp = require('gulp')
const eslint = require('gulp-eslint')
const csslint = require('gulp-csslint')
const htmllint = require('gulp-htmllint')
const gutil = require('gulp-util')

// lint
gulp.task('lint:js', () => {
  return gulp.src(['js/*.js', '*.js'])
    .pipe(eslint())
    .pipe(eslint.format())
})

gulp.task('lint:css', () => {
  gulp.src(['css/*.css'])
    .pipe(csslint())
    .pipe(csslint.formatter())
})

const htmllintReporter = (filepath, issues) => {
  if (issues.length > 0) {
    issues.forEach(function (issue) {
      gutil.log(
        gutil.colors.cyan('[gulp-htmllint] ') +
        gutil.colors.white(filepath + ' [' + issue.line + ',' + issue.column + ']: ') +
        gutil.colors.red('(' + issue.code + ') ' + issue.msg))
    })
    process.exitCode = 1
  }
}

gulp.task('lint:html', () => {
  return gulp.src(['*.html'])
    .pipe(htmllint({}, htmllintReporter))
})

gulp.task('lint', ['lint:js', 'lint:css', 'lint:html'])

gulp.task('default', ['lint'])

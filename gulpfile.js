'use strict'

const gulp = require('gulp')
const eslint = require('gulp-eslint')

// lint

gulp.task('lint:js', () => {
  return gulp.src(['js/*.js', '*.js'])
    .pipe(eslint())
    .pipe(eslint.format())
})

gulp.task('lint', ['lint:js'])

gulp.task('default', ['lint'])

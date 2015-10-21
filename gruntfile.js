module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    jshint: {
      options: {
        jshintrc: true
      },
      all: ['Gruntfile.js', 'src/**/*.js', 'test/**/*.js']
    },

    shell: {
      test: {
        command: 'mocha test/*.test.js && mocha test/entity/*.test.js && mocha test/adapter/*.test.js'
      }
    }


  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-shell');

  grunt.registerTask('lint', ['jshint']);
  grunt.registerTask('test', ['lint', 'shell:test']);
};
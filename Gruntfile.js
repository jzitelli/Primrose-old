/* global module */

var fs = require( "fs" ),
    files = [
      "src/store.js",
      "obj/Primrose.js",
      "lib/analytics.js",
      "lib/ga.js",
      "lib/mailchimp.js",
      "node_modules/cannon/build/cannon.js",
      "node_modules/leapjs/leap-0.6.4.js",
      "node_modules/socket.io-client/socket.io.js",
      "node_modules/three.js/build/three.js"
    ],
    uglifyFiles = files.map( function ( s ) {
      return{
        src: s,
        dest: s.replace( /.*\/(.*).js/, "bin/$1.min.js" )
      };
    } ),
    copyFiles = files.map( function ( s ) {
      return {
        src: s,
        dest: s.replace( /.*\/(.*).js/, "bin/$1.js" )
      };
    } );


module.exports = function ( grunt ) {
  grunt.initConfig( {
    pkg: grunt.file.readJSON( "package.json" ),
    jshint: { default: "src/**/*.js" },
    clean: [ "obj", "bin" ],
    concat: {
      options: {
        banner: "/*\n\
  <%= pkg.name %> v<%= pkg.version %> <%= grunt.template.today(\"yyyy-mm-dd\") %>\n\
  <%= pkg.license.type %>\n\
  Copyright (C) 2015 <%= pkg.author %>\n\
  <%= pkg.homepage %>\n\
  <%= pkg.repository.url %>\n\
*/\n",
        separator: ";",
        footer: "Primrose.VERSION = \"v<%= pkg.version %>\";"
      },
      default: {
        files: {
          "obj/Primrose.js": [ "src/core.js", "src/fx/**/*.js" ]
        }
      }
    },
    uglify: {
      default: {
        files: uglifyFiles
      }
    },
    copy: {
      default: {
        files: copyFiles
      }
    }
  } );

  grunt.loadNpmTasks( "grunt-contrib-clean" );
  grunt.loadNpmTasks( "grunt-exec" );
  grunt.loadNpmTasks( "grunt-contrib-copy" );
  grunt.loadNpmTasks( "grunt-contrib-jshint" );
  grunt.loadNpmTasks( "grunt-contrib-concat" );
  grunt.loadNpmTasks( "grunt-contrib-uglify" );

  grunt.registerTask( "default", [ "jshint", "clean", "concat", "uglify", "copy" ] );
};

/* global module */

var fs = require( "fs" ),
    files = [
      "obj/Primrose.js",
      "lib/three-r73.js",
      "lib/VREffect.js",
      "lib/VRControls.js",
      "lib/ColladaLoader.js",
      "lib/TextGeometry.js",
      "lib/FontUtils.js",
      "lib/webvr-polyfill.js",
      "lib/webvr-manager.js",
      "lib/cannon.js",
      "lib/SPE.js",
      "lib/leap.transform.js",
      "node_modules/leapjs/leap-0.6.4.js",
      "node_modules/socket.io-client/socket.io.js"
    ],
    uglifyFiles = files.map( function ( s ) {
      return {
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
  grunt.registerTask( "quick", [ "concat", "copy" ] );
};

module.exports = function(grunt) {
    grunt.loadNpmTasks("grunt-contrib-jshint");
    grunt.loadNpmTasks("grunt-jscs");
    grunt.loadNpmTasks("grunt-mocha-test");
    grunt.loadNpmTasks("grunt-mocha-istanbul");
    grunt.loadNpmTasks("grunt-serve");
    grunt.loadNpmTasks("grunt-nodemon");

    var testOutputLocation = process.env.CIRCLE_TEST_REPORTS || "test_output";
    var artifactsLocation = "build_artifacts";
    grunt.initConfig({
        jshint: {
            all: ["Gruntfile.js", "server.js", "server/**/*.js", "test/**/*.js", "public/**/*.js", "!public/js/*"],
            options: {
                jshintrc: true,
                esnext : true
            }
        },
        jscs: {
            all: ["Gruntfile.js", "server.js", "server/**/*.js", "test/**/*.js", "public/**/*.js", "!public/js/*"],
            options: {
                esnext : true
            }  
        },
        mochaTest: {
            test: {
                src: ["test/**/*.js"]
            },
            ci: {
                src: ["test/**/*.js"],
                options: {
                    reporter: "xunit",
                    captureFile: testOutputLocation + "/mocha/results.xml",
                    quiet: true
                }
            }
        },
        "mocha_istanbul": {
            test: {
                src: ["test/**/*.js"]
            },
            ci: {
                src: ["test/**/*.js"],
                options: {
                    quiet: true
                }
            },
            options: {
                coverageFolder: artifactsLocation,
                reportFormats: ["none"],
                print: "none"
            }
        },
        "istanbul_report": {
            test: {

            },
            options: {
                coverageFolder: artifactsLocation
            }
        },
        "istanbul_check_coverage": {
            test: {

            },
            options: {
                coverageFolder: artifactsLocation,
                check: {
                    lines: 100,
                    statements: 100,
                    branches: 100,
                    functions: 100
                }
            }
        },
        serve: {
            port: 8080,
            task: ["./server/server.js"]
        },
        nodemon: {
            all: {
                script: "server.js",
                options : {
                    ignore : ["public/"]
                }
            }
        }
    });

    grunt.registerMultiTask("istanbul_report", "Solo task for generating a report over multiple files.", function () {
        var done = this.async();
        var cmd = process.execPath;
        var istanbulPath = require.resolve("istanbul/lib/cli");
        var options = this.options({
            coverageFolder: "coverage"
        });
        grunt.util.spawn({
            cmd: cmd,
            args: [istanbulPath, "report", "--dir=" + options.coverageFolder]
        }, function(err) {
            if (err) {
                return done(err);
            }
            done();
        });
    });

    grunt.registerTask("check", ["jshint", "jscs"]);
    grunt.registerTask("test", ["check", "mochaTest:test", "mocha_istanbul:test", "istanbul_report",
        "istanbul_check_coverage"]);
    grunt.registerTask("ci-test", ["check", "mochaTest:ci", "mocha_istanbul:ci", "istanbul_report",
        "istanbul_check_coverage"]);
    grunt.registerTask("default", "nodemon");

    grunt.registerTask("serve", "Start a custom web server.", function() {
        var done = this.async();
        grunt.log.writeln("Starting web server on port 8080.");
        require("./server/server.js")(8080);
    });
};

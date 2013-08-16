TESTS = test/*.js
REPORTER = spec
TIMEOUT = 10000
MOCHA_OPTS =
G = 


uname := $(shell uname)

#JSCOVERAGE = ./node_modules/jscover/bin/jscover
JSCOVERAGE = ./test/tools/jscoverage.exe

ifneq (,$(findstring Linux, $(uname)))
	JSCOVERAGE = ./jscoverage-0.5.1/jscoverage
endif

test:
	@NODE_ENV=test ./node_modules/mocha/bin/mocha \
		--reporter $(REPORTER) \
		--timeout $(TIMEOUT) $(MOCHA_OPTS) \
		$(TESTS)

test-g:
	@NODE_ENV=test ./node_modules/mocha/bin/mocha \
		--reporter $(REPORTER) \
		--timeout $(TIMEOUT) -g "$(G)" \
		$(TESTS)

test-cov: sumeru-cov
	@SUMERU_COV=1 $(MAKE) test REPORTER=dot
	@SUMERU_COV=1 $(MAKE) test REPORTER=html-cov > coverage.html
	#fix me mocha-lcov-reporter can cause loop and then can not exit
	#@SUMERU_COV=1 $(MAKE) test REPORTER=mocha-lcov-reporter
	#@SUMERU_COV=1 $(MAKE) test REPORTER=mocha-lcov-reporter | ./node_modules/coveralls/bin/coveralls.js
	@rm -rf sumeru-cov

sumeru-cov:
	@rm -rf $@
	@$(JSCOVERAGE) sumeru $@ --no-highlight --encoding=UTF-8

.PHONY: test test-g test-cov sumeru-cov 
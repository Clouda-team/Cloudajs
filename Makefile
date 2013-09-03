TESTS = test/*.js
REPORTER = spec
TIMEOUT = 10000
MOCHA_OPTS =
G = 

JSCOVERAGE = ./node_modules/jscover/bin/jscover

ifeq ($(OS),Windows_NT)
    JSCOVERAGE = ./test/tools/jscoverage.exe
else
    UNAME_S := $(shell uname -s)
    ifeq ($(UNAME_S),Linux)
        JSCOVERAGE = ./jscoverage-0.5.1/jscoverage
    endif
    ifeq ($(UNAME_S),Darwin)
        JSCOVERAGE = ./jscoverage-0.5.1/jscoverage
    endif
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
	@SUMERU_COV=1 $(MAKE) test REPORTER=mocha-lcov-reporter | sed "s/SF:/&sumeru-cov\//g" | COVERALLS_REPO_TOKEN="6ONbo8TZBkarcJTA3TPgdCaWXFHy7fUfY" ./node_modules/coveralls/bin/coveralls.js
	@rm -rf sumeru-cov

sumeru-cov:
	@rm -rf $@
	@$(JSCOVERAGE) sumeru $@ --no-highlight --encoding=UTF-8

.PHONY: test test-g test-cov sumeru-cov 
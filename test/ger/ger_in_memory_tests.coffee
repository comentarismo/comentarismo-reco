# mocha --opts test/mocha.opts test/in_memory_tests.coffee
all_tests = require './all_tests'
all_tests(MemESM)
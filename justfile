node_modules:
	npm install

build-schemas:
	mkdir -p ./dist/schemas
	glib-compile-schemas schemas --targetdir=./dist/schemas

build-ts: build-schemas
	tsc

pack: build-ts
	cp ./search-engines.json ./dist/
	cp -r ./icons/ ./dist/

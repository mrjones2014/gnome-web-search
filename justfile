node_modules:
	npm install

build-schemas:
	mkdir -p ./dist/schemas
	glib-compile-schemas schemas --targetdir=./dist/schemas

build-ts: build-schemas
	tsc

zip: build-ts
	cp metadata.json ./dist/
	zip ./websearch.zip -9r ./dist

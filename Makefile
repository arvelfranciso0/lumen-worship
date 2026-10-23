dev:
	npm run dev

build:
	npm run build

electron-dev:
	npm run electron:dev

electron-build:
	npm run electron:build

release:
	node scripts/github-release.mjs draft release-notes.md
	npm run electron:build -- --publish always
	node scripts/github-release.mjs publish

release-beta:
	node scripts/github-release.mjs draft release-notes-beta.md --prerelease
	npm run electron:build -- --publish always -c.publish.channel=beta
	node scripts/github-release.mjs publish

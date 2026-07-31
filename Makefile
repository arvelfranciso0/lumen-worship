dev:
	npm run dev

build:
	npm run build

electron-dev:
	npm run electron:dev

electron-build:
	npm run electron:build

release:
	npm run electron:build -- --publish always

release-beta:
	npm run electron:build -- --publish always -c.publish.releaseType=prerelease -c.publish.channel=beta -c.releaseInfo.releaseNotesFile=release-notes-beta.md
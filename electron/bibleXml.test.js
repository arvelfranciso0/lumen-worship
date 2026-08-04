"use strict";

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const {
  parseBibleXml, deriveCodeFromFileName, normalizeBibleLanguage, bookNamesForLanguage, BOOKS,
} = require("./bibleXml.js");

// Every excerpt below is copied verbatim (not fabricated) from
// public/bible/CebuanoRCPVBible.xml, the real Cebuano RCPV sample bundled
// with this project — line numbers noted per case are as of the file's
// content at the time this test was written, for re-verifying against the
// source if it's ever edited.

describe("parseBibleXml — verse bridges (empty-verse merging)", () => {
  test("normal chapter with no merges: Genesis 1:1-5 (lines 6-10)", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bible translation="Cebuano RCPV 1999 (Ang Bag-ong Maayong Balita Biblia)" link="https://www.bible.com/bible/562/GEN.1.RCPV" status="© 1999 Philippine Bible Society">
	<testament name="Old">
		<book number="1">
			<chapter number="1">
				<verse number="1">Sa pagsugod sa Dios pagbuhat sa kalibotan ug sa tanang butang sa kalangitan,</verse>
				<verse number="2">ang kalibotan haw-ang ug walay hitsura. Ang kadagatan gitabonan sa kangitngit ug ang Espiritu sa Dios naglihok ibabaw sa katubigan.</verse>
				<verse number="3">Unya miingon ang Dios, “Motungha ang kahayag.” Ug mitungha ang kahayag.</verse>
				<verse number="4">Nahimuot ang Dios sa kahayag nga iyang nakita ug gilain niya kini gikan sa kangitngit.</verse>
				<verse number="5">Ginganlan niyag “Adlaw” ang kahayag ug ang kangitngit ginganlan niyag “Gabii.” Milabay ang kagabhion ug miabot ang kabuntagon. Mao kadto ang unang adlaw.</verse>
			</chapter>
		</book>
	</testament>
</bible>`;
    const { books } = parseBibleXml(xml);
    const verses = books[0].chapters[0].verses;
    assert.deepEqual(verses.map((v) => v.number), [1, 2, 3, 4, 5]);
    for (const verse of verses) assert.equal(verse.endNumber, undefined);
  });

  test("single merged pair: Genesis 6:1-3 (lines 153-156)", () => {
    const xml = `<bible>
  <book number="1">
    <chapter number="6">
      <verse number="1">Niadtong panahona daghan na ang mga tawo sa kalibotan ug maanyag ang ilang mga anak nga babaye. Nakita kini sa pipila ka langitnong mga binuhat ug gipangasawa nila ang ilang nagustohan.</verse>
      <verse number="2"></verse>
      <verse number="3">Unya ang Ginoo miingon, “Dili ko tugotan ang tawo nga mabuhi hangtod sa kahangtoran kay tawo lamang siya. Sukad karon kutob ra gayod sa 120 ka tuig ang ilang kinabuhi.”</verse>
    </chapter>
  </book>
</bible>`;
    const { books } = parseBibleXml(xml);
    const verses = books[0].chapters[0].verses;
    assert.equal(verses.length, 2, "verse 2 must be merged away, not appear as its own entry");
    assert.equal(verses[0].number, 1);
    assert.equal(verses[0].endNumber, 2);
    assert.match(verses[0].text, /Niadtong panahona/);
    assert.equal(verses[1].number, 3);
    assert.equal(verses[1].endNumber, undefined);
  });

  test("three-or-more merged in a row: Leviticus 11:23-30 (lines 3230-3237)", () => {
    const xml = `<bible>
  <book number="3">
    <chapter number="11">
      <verse number="23">Apan ang ubang gagmayng mananap nga pak-an ug may upat ka tiil hugaw alang kaninyo.</verse>
      <verse number="24">“Bisan kinsa ang mohikap sa patayng lawas niining mosunod nga mga mananap, mahugaw hangtod sa gabii: ang tanang mananap nga may kuko nga dili pikas ug dili mousap sa ilang kinaon ug ang tanang mananap nga may upat ka tiil ug may talinis nga mga kuko hugaw alang kaninyo. Ang mohikap sa patay nilang lawas mahugaw hangtod sa gabii. Kinahanglang labhan ang bisti niadtong magdala sa patayng lawas niini; magpabilin siyang hugaw hangtod sa gabii.</verse>
      <verse number="25"></verse>
      <verse number="26"></verse>
      <verse number="27"></verse>
      <verse number="28"></verse>
      <verse number="29">“Mao kining mga mananapa nga nagkamang sa yuta ang isipon ninyong hugaw: ang milo, ang ilaga, ang nagkalainlaing matang sa halo,</verse>
      <verse number="30">ang tuko, ang buaya, ang talu-to, ang ibid ug ang kameleyon.</verse>
    </chapter>
  </book>
</bible>`;
    const { books } = parseBibleXml(xml);
    const verses = books[0].chapters[0].verses;
    assert.deepEqual(
      verses.map((v) => v.number), [23, 24, 29, 30],
      "verses 25-28 must all merge into 24, none of them appearing as their own entry"
    );
    assert.equal(verses.find((v) => v.number === 24).endNumber, 28);
  });

  test("an empty verse with nothing preceding it in the chapter is dropped, not merged: 1 Samuel 13:1-3 (lines 7915-7918)", () => {
    // 1 Samuel 13:1 is the well-known case where the source text itself is
    // defective/uncertain — this translation leaves it blank rather than
    // merging it into anything (there's nothing earlier in the chapter to
    // merge into). Distinct from a verse bridge: dropped, not merged.
    const xml = `<bible>
  <book number="9">
    <chapter number="13">
      <verse number="1"></verse>
      <verse number="2">Nagpili si Saul ug 3,000 ka tawo sa Israel, 2,000 ang didto uban ni Saul sa Mikmas ug sa kabungtoran sa Betel ug ang 1,000 uban sa iyang anak nga si Jonatan didto sa Gibeah sa Benjamin. Ang ubang katawhan gipapauli niya ngadto sa ilang tagsatagsa ka tolda.</verse>
      <verse number="3">Gibuntog ni Jonatan ang kampo sa mga Filistihanon nga didto sa Geba ug nakabalita niini ang mga Filistihanon. Ug gipatigom ni Saul ang tanang mga Israelita alang sa gubat pinaagi sa pagpatingog sa trumpeta.</verse>
    </chapter>
  </book>
</bible>`;
    const { books } = parseBibleXml(xml);
    const verses = books[0].chapters[0].verses;
    assert.deepEqual(verses.map((v) => v.number), [2, 3]);
    assert.equal(verses[0].endNumber, undefined);
  });
});

describe("parseBibleXml — self-closing empty verse tags", () => {
  // No self-closing <verse .../> tags exist anywhere in the real Cebuano
  // RCPV sample (confirmed by searching the whole file) — every empty verse
  // there uses <verse number="N"></verse>. These two cases are synthetic,
  // not pulled from real data, since no real example of this style exists
  // yet — covering it anyway because another translation file might use it,
  // possibly even mixed with the open/close style within itself.
  test("self-closing empty verse merges the same way as an open/close empty verse", () => {
    const xml = `<bible><book number="1"><chapter number="1"><verse number="1">first</verse><verse number="2"/><verse number="3">third</verse></chapter></book></bible>`;
    const verses = parseBibleXml(xml).books[0].chapters[0].verses;
    assert.deepEqual(verses.map((v) => v.number), [1, 3]);
    assert.equal(verses[0].endNumber, 2);
  });

  test("mixed self-closing and open/close empty verses within the same chapter", () => {
    const xml = `<bible><book number="1"><chapter number="1"><verse number="1">first</verse><verse number="2"/><verse number="3"></verse><verse number="4">fourth</verse></chapter></book></bible>`;
    const verses = parseBibleXml(xml).books[0].chapters[0].verses;
    assert.deepEqual(verses.map((v) => v.number), [1, 4]);
    assert.equal(verses[0].endNumber, 3);
  });
});

describe("deriveCodeFromFileName / parseBibleXml code fallback", () => {
  test("strips .xml and a trailing Bible suffix, matching convert-bible.mjs's own derivation", () => {
    assert.equal(deriveCodeFromFileName("CebuanoRCPVBible.xml"), "CebuanoRCPV");
  });

  test("falls back to the filename-derived code when the file has no code/id attribute — the real sample file has none", () => {
    const xml = `<bible translation="Cebuano RCPV 1999 (Ang Bag-ong Maayong Balita Biblia)" link="https://www.bible.com/bible/562/GEN.1.RCPV" status="© 1999 Philippine Bible Society"><book number="1"><chapter number="1"><verse number="1">x</verse></chapter></book></bible>`;
    const { meta } = parseBibleXml(xml, "CebuanoRCPVBible.xml");
    assert.equal(meta.code, "CebuanoRCPV");
  });

  test("an explicit code/id attribute always wins over the filename fallback", () => {
    const xml = `<bible code="EnglishKJ"><book number="1"><chapter number="1"><verse number="1">x</verse></chapter></book></bible>`;
    const { meta } = parseBibleXml(xml, "some-other-name.xml");
    assert.equal(meta.code, "EnglishKJ");
  });
});

describe("language fallback", () => {
  test("derives language from the leading word of translation= when there's no language attribute — the real sample file's actual root tag", () => {
    const xml = `<bible translation="Cebuano RCPV 1999 (Ang Bag-ong Maayong Balita Biblia)" link="https://www.bible.com/bible/562/GEN.1.RCPV" status="© 1999 Philippine Bible Society"><book number="1"><chapter number="1"><verse number="1">x</verse></chapter></book></bible>`;
    const { meta } = parseBibleXml(xml, "CebuanoRCPVBible.xml");
    assert.equal(meta.language, "Cebuano");
  });

  test("an explicit language attribute always wins over the translation-name fallback", () => {
    const xml = `<bible language="English" translation="Something RCPV">
      <book number="1"><chapter number="1"><verse number="1">x</verse></chapter></book></bible>`;
    const { meta } = parseBibleXml(xml);
    assert.equal(meta.language, "English");
  });

  test("a two-word language attribute is still trusted", () => {
    const xml = `<bible language="Ancient Greek" translation="Something LXX">
      <book number="1"><chapter number="1"><verse number="1">x</verse></chapter></book></bible>`;
    const { meta } = parseBibleXml(xml);
    assert.equal(meta.language, "Ancient Greek");
  });
});

// Regression: a real import showed "Cebuano 1999 (Maayong Balita Biblia)" in the
// sidebar's Language list, sitting next to the genuine "Cebuano" from another
// file, because the exporter had written the whole translation title into the
// language attribute.
describe("normalizeBibleLanguage — title-shaped language attributes", () => {
  test("a language attribute containing a year and brackets is rejected in favour of the title's leading word", () => {
    assert.equal(
      normalizeBibleLanguage("Cebuano 1999 (Maayong Balita Biblia)", "Cebuano 1999 (Maayong Balita Biblia)"),
      "Cebuano"
    );
  });

  test("parseBibleXml applies the same rejection end to end", () => {
    const xml = `<bible language="Cebuano 1999 (Maayong Balita Biblia)" translation="Cebuano 1999 (Maayong Balita Biblia)">
      <book number="1"><chapter number="1"><verse number="1">x</verse></chapter></book></bible>`;
    const { meta } = parseBibleXml(xml);
    assert.equal(meta.language, "Cebuano");
    // The full title is still preserved as the translation's display name.
    assert.equal(meta.name, "Cebuano 1999 (Maayong Balita Biblia)");
  });

  test("a parenthesised language recovers its leading word rather than becoming Unknown", () => {
    assert.equal(normalizeBibleLanguage("Chinese (Simplified)", ""), "Chinese");
  });

  test("three or more words is treated as a title, not a language", () => {
    assert.equal(normalizeBibleLanguage("New International Version", "English NIV"), "English");
  });

  test("falls back to Unknown only when there is nothing usable at all", () => {
    assert.equal(normalizeBibleLanguage("", ""), "Unknown");
    assert.equal(normalizeBibleLanguage(undefined, undefined), "Unknown");
  });
});

// The XML numbers books 1-66 and never names them, so the name table is the only
// source of truth — and it has to follow the translation's language or a Cebuano
// Bible reads with English book names throughout.
describe("book names per language", () => {
  test("every language table covers the full 66-book canon", () => {
    assert.equal(BOOKS.length, 66);
    for (const language of ["Cebuano"]) {
      const names = bookNamesForLanguage(language);
      assert.equal(names.length, 66, language + " must have 66 book names");
      assert.equal(new Set(names).size, 66, language + " must have no duplicate book names");
      assert.ok(names.every((name) => typeof name === "string" && name.length > 0));
    }
  });

  test("an unlisted language falls back to the English table", () => {
    assert.equal(bookNamesForLanguage("English"), BOOKS);
    assert.equal(bookNamesForLanguage("Klingon"), BOOKS);
    assert.equal(bookNamesForLanguage(undefined), BOOKS);
  });

  test("Cebuano names sit at the right canonical positions", () => {
    const cebuano = bookNamesForLanguage("Cebuano");
    assert.equal(cebuano[0], "Genesis");
    assert.equal(cebuano[1], "Exodo");
    assert.equal(cebuano[18], "Mga Salmo");
    assert.equal(cebuano[39], "Mateo");
    assert.equal(cebuano[65], "Pinadayag");
  });

  test("parseBibleXml names books in the translation's own language", () => {
    // Root tag copied from public/bible/CebuanoRCPVBible.xml — the language
    // resolves to "Cebuano" via the translation-title fallback.
    const xml = `<bible translation="Cebuano RCPV 1999 (Ang Bag-ong Maayong Balita Biblia)">
      <book number="19"><chapter number="23"><verse number="1">x</verse></chapter></book>
      <book number="66"><chapter number="22"><verse number="21">y</verse></chapter></book>
    </bible>`;
    const { meta, books } = parseBibleXml(xml);
    assert.equal(meta.language, "Cebuano");
    assert.equal(books[0].name, "Mga Salmo");
    assert.equal(books[1].name, "Pinadayag");
  });

  test("an English translation still gets English book names", () => {
    const xml = `<bible language="English" translation="King James Version">
      <book number="19"><chapter number="23"><verse number="1">x</verse></chapter></book>
    </bible>`;
    const { books } = parseBibleXml(xml);
    assert.equal(books[0].name, "Psalms");
  });

  test("a book number outside the canon still yields a usable name", () => {
    const xml = `<bible language="Cebuano"><book number="99"><chapter number="1"><verse number="1">x</verse></chapter></book></bible>`;
    const { books } = parseBibleXml(xml);
    assert.equal(books[0].name, "Unknown 99");
  });
});

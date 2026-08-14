import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  deriveIdentifierKey,
  deriveNameKeyV1,
  normalizeGOTIdentity,
  parseCanonicalGOTIdentity,
} from "../sdk/nameKeys.js";

describe("GOT Links Model name keys", function () {
  const vectors = [
    ["got", "@dima", "got:dima", "0x30a06aaeff91473d7ee33abc0fd5df8035d396a6e08eb8e897dc2f0e7c76017d"],
    ["x", "@vitalik", "x:vitalik", "0x0461b719c64cee37778c51d241ff9483fd7d9bef4988591915639d1f03cb9e7c"],
    ["tg", "@dima", "telegram:dima", "0x87c11a9c517d43f19d31777500762d8ad70c05e5b504936ff0fd246a34c65cdf"],
    [
      "email",
      "alice@Example.COM",
      "email:alice@example.com",
      "0x3425d4006b9f3db86dbe07521c674f43120dd17e73e7d338dff954ac5202b822",
    ],
    [
      "phone",
      "+491234567890",
      "phone:+491234567890",
      "0x1e5212a74a3334ae59243952efcec237f894f7b448e58ba1bee84764aa369cde",
    ],
    ["github", "@Octocat", "github:octocat", "0x9b438a8ea6d6a299d7833a3776f46b18a99186160d98ebceeb41028eb3a6a3b7"],
    ["ens", "ALICE.eth", "ens:alice.eth", "0xa96e7a476dbfca9801a9ac0211c2cccdc08ad58e8b3432133d860dc8b5277de4"],
    [
      "domain",
      "Bücher.Example",
      "domain:xn--bcher-kva.example",
      "0x77d0bb7017b33c0b3da8b68bd1da930c492a1aa30837596fe5ad39dda8fbb054",
    ],
    [
      "custom:shop",
      "order-123",
      "custom:shop:order-123",
      "0x9271bae65fa0f8dbe2a69fe28f554718563f751ed7c339b9dce87ef532143aab",
    ],
  ] as const;

  for (const [namespace, input, expectedCanonicalIdentity, expectedKey] of vectors) {
    it(`normalizes and hashes ${namespace} identities`, function () {
      const canonicalIdentity = normalizeGOTIdentity(namespace, input);
      assert.equal(canonicalIdentity, expectedCanonicalIdentity);
      assert.equal(deriveNameKeyV1(namespace, input), expectedKey);
      assert.equal(deriveIdentifierKey(canonicalIdentity), expectedKey);
      assert.equal(parseCanonicalGOTIdentity(canonicalIdentity), canonicalIdentity);
    });
  }

  it("rejects delimiter collisions and unsupported namespaces", function () {
    assert.throws(() => deriveNameKeyV1("custom:shop", "a:b"), /identifier/);
    assert.throws(() => deriveNameKeyV1("custom", "shop:a:b"), /namespace/);
    assert.throws(() => deriveNameKeyV1("custom:shop:other", "a"), /namespace/);
    assert.throws(() => deriveNameKeyV1("unknown", "alice"), /namespace/);
  });

  it("rejects malformed namespace-specific identifiers", function () {
    assert.throws(() => deriveNameKeyV1("got", "@@Alice"), /handle/);
    assert.throws(() => deriveNameKeyV1("email", "a@@Example.COM"), /email/);
    assert.throws(() => deriveNameKeyV1("phone", "+49 123 456"), /E\.164/);
    assert.throws(() => deriveNameKeyV1("domain", "example"), /domain/);
    assert.throws(() => deriveNameKeyV1("github", "two--hyphens"), /github/);
  });

  it("accepts only already-normalized strings at the direct hashing boundary", function () {
    assert.throws(() => parseCanonicalGOTIdentity("tg:dima"), /canonical/);
    assert.throws(() => parseCanonicalGOTIdentity("x:@vitalik"), /canonical/);
    assert.throws(() => parseCanonicalGOTIdentity("domain:Bücher.Example"), /canonical/);
    assert.throws(() => parseCanonicalGOTIdentity("custom:shop:a:b"), /canonical/);
  });
});

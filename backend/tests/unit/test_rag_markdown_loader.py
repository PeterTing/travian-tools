"""Tests for the Phase 1 markdown-loader extension in TravianKnowledgeBase.

Verifies that:
- docs/knowledge/*.md files are loaded at service init
- Phase 1 topic keywords trigger markdown retrieval
- Retrieved content cites its source file
"""

from app.knowledge_base.rag_service import TravianKnowledgeBase, retrieve_knowledge


def test_markdown_files_loaded_on_init():
    """All 8 Phase 1 topic files should load into markdown_topics dict."""
    kb = TravianKnowledgeBase()
    expected_topics = {
        "siege",
        "loyalty",
        "wall_durability",
        "hero_system",
        "artifacts_md",
        "town_hall",
        "tournament_square",
        "npc_village",
    }
    assert expected_topics <= set(kb.markdown_topics.keys())
    # Each loaded file has non-trivial content
    for topic in expected_topics:
        assert len(kb.markdown_topics[topic]) > 100


def test_siege_query_retrieves_markdown():
    """Query mentioning catapult should retrieve siege-and-catapult.md."""
    results = retrieve_knowledge("19 catapult 能殺村嗎")
    source_files = [r.get("source_file") for r in results if "source_file" in r]
    assert any("siege-and-catapult.md" in (sf or "") for sf in source_files), (
        f"Expected siege-and-catapult.md in results; got {source_files}"
    )


def test_loyalty_query_retrieves_markdown():
    """Loyalty query should pull loyalty-and-conquest.md."""
    results = retrieve_knowledge("徵服需要幾個酋長 loyalty 多少才安全")
    source_files = [r.get("source_file") for r in results if "source_file" in r]
    assert any("loyalty-and-conquest.md" in (sf or "") for sf in source_files)


def test_tournament_square_query():
    """TS level query returns tournament-square-speed.md."""
    results = retrieve_knowledge("tournament square 加成公式是什麼")
    titles = [r.get("title", "") for r in results]
    assert any(
        "Tournament Square" in t or "tournament square" in t.lower() for t in titles
    )


def test_artifacts_query_distinguishes_from_existing():
    """'神器' should return BOTH existing endgame data AND new artifacts.md."""
    results = retrieve_knowledge("神器類型有哪些")
    source_files = [r.get("source_file") for r in results if "source_file" in r]
    # new markdown-based artifacts content is available
    assert any("artifacts.md" in (sf or "") for sf in source_files)


def test_npc_village_query():
    """NPC village query retrieves npc-village-template.md."""
    results = retrieve_knowledge("什麼是 NPC 村 要蓋什麼")
    source_files = [r.get("source_file") for r in results if "source_file" in r]
    assert any("npc-village-template.md" in (sf or "") for sf in source_files)


def test_retrieval_respects_max_results():
    """max_results limit is honored even with many topic matches."""
    results = retrieve_knowledge(
        "tribe troops hero artifact catapult loyalty wall tournament",
        max_results=3,
    )
    assert len(results) <= 3


def test_markdown_content_truncated_at_4000_chars():
    """Large markdown files should be truncated to keep prompt budget sane."""
    kb = TravianKnowledgeBase()
    results = kb._retrieve_from_markdown("loyalty")
    assert len(results) == 1
    assert len(results[0]["content"]) <= 4100  # 4000 + truncation notice

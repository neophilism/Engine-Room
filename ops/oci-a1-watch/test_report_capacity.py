#!/usr/bin/env python3
import importlib.util
from pathlib import Path
from types import SimpleNamespace
import unittest

path = Path(__file__).with_name("report_capacity.py")
spec = importlib.util.spec_from_file_location("report_capacity", path)
watch = importlib.util.module_from_spec(spec)
spec.loader.exec_module(watch)


def shape(status, count, cpu=2, ram=12):
    return SimpleNamespace(
        instance_shape="VM.Standard.A1.Flex", availability_status=status,
        available_count=count, fault_domain=None,
        instance_shape_config=SimpleNamespace(ocpus=cpu, memory_in_gbs=ram)
    )


class WatchTests(unittest.TestCase):
    def test_true_capacity(self):
        out = watch.normalize_capacity([("AD-1", [shape("AVAILABLE", 2)])])
        self.assertEqual(out["report_state"], "AVAILABLE")
        self.assertEqual(out["availability"][0]["available_count"], 2)

    def test_zero_capacity_fails_closed(self):
        out = watch.normalize_capacity([("AD-1", [shape("AVAILABLE", 0)])])
        self.assertEqual(out["report_state"], "ERROR")

    def test_partial_failure_does_not_fake_outage(self):
        out = watch.normalize_capacity(
            [("AD-1", [shape("OUT_OF_HOST_CAPACITY", 0)])], errors=["AD-2"]
        )
        self.assertEqual(out["report_state"], "ERROR")

    def test_partial_failure_with_real_capacity_alerts(self):
        out = watch.normalize_capacity(
            [("AD-1", [shape("AVAILABLE", 1)])], errors=["AD-2"]
        )
        self.assertEqual(out["report_state"], "AVAILABLE")

    def test_mismatched_config_is_ignored(self):
        out = watch.normalize_capacity([("AD-1", [shape("AVAILABLE", 4, 1, 6)])])
        self.assertEqual(out["report_state"], "ERROR")
        self.assertEqual(out["availability"], [])

    def test_normal_out_of_capacity(self):
        out = watch.normalize_capacity([
            ("AD-1", [shape("OUT_OF_HOST_CAPACITY", 0)]),
            ("AD-2", [shape("OUT_OF_HOST_CAPACITY", 0)]),
        ])
        self.assertEqual(out["report_state"], "OUT_OF_HOST_CAPACITY")

    def test_issue_markers_preserved(self):
        old = "Before\n" + watch.START + "\n{}\n" + watch.END + "\nAfter"
        new = watch.render_issue_body(old, {"report_state": "ERROR"})
        self.assertIn("Before", new)
        self.assertIn("After", new)
        self.assertEqual(new.count(watch.START), 1)
        self.assertEqual(new.count(watch.END), 1)

    def test_issue_missing_markers_rejected(self):
        with self.assertRaises(ValueError):
            watch.render_issue_body("hello", {"report_state": "AVAILABLE"})


if __name__ == "__main__":
    unittest.main()

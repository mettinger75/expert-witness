#!/usr/bin/env python3
"""Scrub generator-identifying metadata from a locally produced PDF artifact.

Removes the XMP metadata stream and the entire document-info dictionary
(Producer, Creator, Subject, dates, and any AI-tooling annotations), then
optionally sets an allowlisted Title/Author. Use this on every ad-hoc
artifact rendered outside the app (ReportLab drafts, exported CVs, letters)
before it can be transmitted anywhere.

ONLY for artifacts we generate. NEVER run this on source medical records,
opposing productions, or other evidence files — provenance metadata on
evidence must be preserved.

Usage:
  python3 scripts/scrub-pdf-metadata.py FILE [FILE ...] [--title T] [--author A]
"""

import argparse
import sys

from pypdf import PdfWriter
from pypdf.generic import NameObject


def scrub(path: str, title: str, author: str) -> None:
    writer = PdfWriter(clone_from=path)

    # Drop the cloned document-info dictionary entirely
    writer.metadata = None

    # Drop the XMP metadata stream if the generator attached one
    root = writer._root_object
    if "/Metadata" in root:
        del root[NameObject("/Metadata")]

    fields = {}
    if title:
        fields["/Title"] = title
    if author:
        fields["/Author"] = author
    if fields:
        writer.add_metadata(fields)

    with open(path, "wb") as fh:
        writer.write(fh)


def main() -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("files", nargs="+", help="PDF files to scrub in place")
    parser.add_argument("--title", default="", help="Title to set (default: none)")
    parser.add_argument("--author", default="", help="Author to set (default: none)")
    args = parser.parse_args()

    for path in args.files:
        scrub(path, args.title, args.author)
        print(f"scrubbed: {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

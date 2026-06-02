"""code-glossary — functionality glossary builder + DRY audit.

See DESIGN-V2.md (one folder up) for the architecture, schema, and roadmap.
"""

from code_glossary.constants import SCHEMA_VERSION, GENERATOR_NAME, GENERATOR_VERSION
from code_glossary.records import (
    SourceLocation,
    FunctionRecord,
    SpecRecord,
    SignalFingerprint,
    VariantAxisEntry,
    Instance,
    GlossaryEntry,
    Glossary,
)

__all__ = [
    "SCHEMA_VERSION",
    "GENERATOR_NAME",
    "GENERATOR_VERSION",
    "SourceLocation",
    "FunctionRecord",
    "SpecRecord",
    "SignalFingerprint",
    "VariantAxisEntry",
    "Instance",
    "GlossaryEntry",
    "Glossary",
]

__version__ = GENERATOR_VERSION

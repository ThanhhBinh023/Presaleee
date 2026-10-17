import os
import sys

# Ensure import paths work
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from generate_all_10_leads_and_proposals import (
    build_lead_workbook,
    build_proposal_workbook
)
from build_full_10_dataset import get_scenario_01
from scenario_definitions_part1 import (
    get_scenario_02,
    get_scenario_03,
    get_scenario_04,
    get_scenario_05
)
from scenario_definitions_part2 import (
    get_scenario_06,
    get_scenario_07,
    get_scenario_08,
    get_scenario_09,
    get_scenario_10
)

DEST_DIRS = [
    os.path.abspath("data/sample_leads_proposals"),
    os.path.abspath("ai/output/sample_leads_proposals")
]

SCENARIO_RUNNERS = [
    ("01_Retail_Omnichannel", get_scenario_01),
    ("02_FinTech_DigitalBanking", get_scenario_02),
    ("03_HealthTech_Hospital_HIS", get_scenario_03),
    ("04_Hospitality_Hotel_PMS", get_scenario_04),
    ("05_Logistics_Fleet_Telematics", get_scenario_05),
    ("06_EdTech_LMS_AI_Proctoring", get_scenario_06),
    ("07_PropTech_Smart_Tenant_Portal", get_scenario_07),
    ("08_Grocery_Delivery_SuperApp", get_scenario_08),
    ("09_Enterprise_Cloud_HRM_Payroll", get_scenario_09),
    ("10_Industrial_IoT_Predictive_Maintenance", get_scenario_10)
]

def generate_all():
    print("======================================================================")
    print("🚀 GENERATING ALL 10 ENTERPRISE LEADS & 10 PROPOSALS (10 SHEETS EACH)")
    print("======================================================================\n")

    for dest in DEST_DIRS:
        os.makedirs(dest, exist_ok=True)

    generated_pairs = []

    for name, getter in SCENARIO_RUNNERS:
        print(f"📦 Building Scenario {name}...")
        rfp_meta, rfp_sections, p_data = getter()

        lead_filename = f"Lead_{name}.xlsx"
        prop_filename = f"Proposal_{name}.xlsx"

        for dest in DEST_DIRS:
            lead_path = os.path.join(dest, lead_filename)
            prop_path = os.path.join(dest, prop_filename)

            build_lead_workbook(lead_path, rfp_meta, rfp_sections)
            build_proposal_workbook(prop_path, p_data)

        generated_pairs.append((name, lead_filename, prop_filename))
        print(f"   ✅ Created: {lead_filename}")
        print(f"   ✅ Created: {prop_filename}\n")

    print("======================================================================")
    print("✨ ALL 10 LEADS & 10 FULL PROPOSALS GENERATED SUCCESSFULLY!")
    print(f"📁 Destination 1: {DEST_DIRS[0]}")
    print(f"📁 Destination 2: {DEST_DIRS[1]}")
    print(f"📊 Total files created: {len(generated_pairs) * 2} files per directory")
    print("======================================================================")

if __name__ == "__main__":
    generate_all()

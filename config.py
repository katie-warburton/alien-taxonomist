from __future__ import print_function
from os import getenv

jsPsychCurrent = True # Use the latest jsPsych, else use jsPsych 6

NAME="AlienTaxonomist"
EXPT_UID="UniqueID"
RESULTS_DIR="2025/AlienTaxonomist/results"

PROLIFIC_COMPLETION_CODE = None

# Restrict device on AWS
RESTRICTIONS = ["mobile", "tablet", "tv"]

# AWS Settings
AWS_DEFAULT_REGION = 'us-west-2'

# SimpleDB databases for experiments and participants
SDB_EXPERIMENTS = "mall_experiments"
SDB_EXPERIMENTS_PARTICIPANTS = "mall_experiments_participants"

# variable for REP crediting
REP_ON_CONSENT = False                                                       #both XXXX need to be replaced
REP_URL = 'https://unimelb.sona-systems.com/services/SonaAPI.svc/WebstudyCredit?experiment_id=XXXX&credit_token=XXXX&survey_code={}'


DEBUG = True
if getenv('ExptEnv') == 'Production':
    DEBUG = False

if __name__ == "__main__":
    print(EXPT_UID)

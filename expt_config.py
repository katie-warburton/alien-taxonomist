from __future__ import print_function
from builtins import range
from MallExperiment import Expt
from user_utils import nocache
from random import shuffle
import random
from flask import render_template, Blueprint, request
import copy
import config
import json
import requests
# If you are developing your experiment
# then set the DEBUG flag to True
DEBUG = config.DEBUG

s3_results_key = config.RESULTS_DIR + "/{}.json" # Must have formatting space ({}) for Participant Unique ID 

# Every experiment needs a unique ID
expt_uid = config.EXPT_UID

#########################################################################
### (0) Get condition parameters
#########################################################################
## >> the parts for all combinations
##  theCondition = {1:'interleaved', 2:'block-fam', 3:'block-novel'}
### but we aren't using the above dictionary.....!!!



#########################################################################
### (1) Server stuff - don't touch!
#########################################################################


# Other global Experimental Variables
assignment_file = 'participant-assignments.json'
conditions_file = 'conditions.json'
stimuli_paths_file = 'stimuli-data.json'


# Using Expt to fetch stimulus data from S3
me_expt = Expt()

# Flask Blueprints can be used to add routes for custom_code
custom_code = Blueprint('expt_custom_code', __name__)
@custom_code.route('/debrief', methods=['post'])
@nocache
def debrief():
    data = request.form.get('data')
    uid = request.form.get('uid')
    mturk = request.form.get('mturk')
    prolific = request.form.get('prolific')

    mturk_survey_code = None
    if mturk:
        if DEBUG:
            mturk_survey_code = 9999
        else:
            mturk_survey_code = me_expt.get_mturk_survey_code(uid, 'mall_experiments_participants')

    prolific_completion_code = None
    if prolific:
        prolific_completion_code = config.PROLIFIC_COMPLETION_CODE

    return render_template(
        'debrief-short.html',
        mturk_survey_code=mturk_survey_code,
        prolific_completion_code=prolific_completion_code
        )


@custom_code.route('/full-debrief', methods=['get'])
@nocache
def full_debrief():
    return render_template(
            'debrief-long.html'
            )
# All experiments must provide a 'get_data' function that
# returns any stimulus data which will be used in the HTML templates  
# 
# opts: a dictionary of parameters that were passed in the GET request
#       e.g., https://yourexpt/expt?condition=1&debug=0
#             opts = {
#                'condition': '1',
#                'debug': '0'
#                }



#########################################################################
### (2) Organize stimuli
#  The only thing we need is get_data()
#########################################################################

def get_data(opts):
    # Setup experiment tasks
    cond = opts['condition']
    trial_set = fetch_trials(cond)
    trial_codes = fetch_codes(trial_set)
    stimuli_paths = fetch_stimuli()
    return {'trials': trial_codes, 'stimuli': stimuli_paths}
    
def fetch_trials(cond):
    assignments = me_expt.get_file(assignment_file)
    trial_set = assignments[cond]
    return trial_set
    
def fetch_codes(trial_set):
    conditions = me_expt.get_file(conditions_file)
    return [conditions[str(i)] for i in trial_set]

def fetch_stimuli():
    sets = me_expt.get_file(stimuli_paths_file)['paths']
    random.shuffle(sets)
    return sets


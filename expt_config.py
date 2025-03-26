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
params_file = 'condition-params.json'


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
    stimuli_paths, species_names = fetch_stimuli()
    orders, shift, distractors = fetch_params()
    item_sets = get_item_sets(trial_codes, orders, shift, distractors)
    return {'trials': trial_codes, 'stimuli': stimuli_paths, 'names': species_names, 'orders': item_sets}
    

def get_item_sets(trials, orders, shift, distractors):
    item_sets = {}
    for d, l, o in trials:
        items = orders[o]
        if l == 'L':
            items = [i-shift for i in items]
        elif l == 'R':
            items = [i+shift for i in items]
        if o == 'F':
            items = items[0:1] + distractors[0:1] + items[1:4] + distractors[1:2] + items[4:5] + distractors[2:3] + items[5:8] + distractors[3:4] + items[8:9]
        elif o == 'B':
            items = items[0:1] + distractors[3:4] + items[1:4] + distractors[2:3] + items[4:5] + distractors[1:2] + items[5:8] + distractors[0:1] + items[8:9]
        else:
            items = items[0:1] + distractors[3:4] + items[1:4] + distractors[0:1] + items[4:5] + distractors[2:3] + items[5:8] + distractors[1:2] + items[8:9]
        code = f'{d}{l}{o}'
        item_sets[code] = items
    return item_sets

def fetch_trials(cond):
    assignments = me_expt.get_file(assignment_file)
    trial_set = assignments[cond]
    return trial_set
    
def fetch_codes(trial_set):
    conditions = me_expt.get_file(conditions_file)
    current_conds = [tuple(conditions[str(i)]) for i in trial_set]
    random.shuffle(current_conds)
    return [(int(d), l, o) for d,l,o in current_conds]

def fetch_stimuli():
    stimuli_data = me_expt.get_file(stimuli_paths_file)
    sets = stimuli_data['paths']
    names = stimuli_data['names']
    random.shuffle(sets)
    random.shuffle(names)
    return sets, names

def fetch_params():
    param_data = me_expt.get_file(params_file)
    return param_data['orders'], param_data['shift'], param_data['distractors']
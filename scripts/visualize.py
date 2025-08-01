#! /usr/bin/env python3
'''
Visualize the decision tree defined in a YAML file

Visualize with: https://dreampuf.github.io/GraphvizOnline
'''

# standard imports
from os.path import isfile
from sys import argv, stderr

# non-standard imports
try:
    from yaml import safe_load
except:
    print("Unable to import `yaml`. Install: pip install pyyaml")

# constants
DUMMY_OUTCOME_PREFIX = 'dummy_outcome'

# helper function to print error messages and quit
def error(s='', end='\n', file=stderr, exit_status=1):
    print(s, end=end, file=file); exit(exit_status)

# run tool
if __name__ == "__main__":
    # check user args and load raw YAML data
    if len(argv) != 2 or argv[1].replace('-','').strip().lower() in {'h', 'help'}:
        error("USAGE: %s <config.yaml>" % argv[0])
    if not isfile(argv[1]):
        error("File not found: %s" % argv[1])
    try:
        with open(argv[1], 'rt') as f:
            yaml_data = safe_load(f)
    except:
        error("Invalid YAML: %s" % argv[1])

    # parse graph from YAML
    node_labels = dict() # node_labels[variable] = label of variable (question or outcome)
    edges = dict() # edges[question_var] = [answer_text_1,type_1,var_1), ...]
    num_outcomes = 0
    for question_var, question_data in yaml_data['question_variables'].items():
        if question_var not in edges:
            edges[question_var] = list()
        if 'question_text' in question_data:
            question_text = question_data['question_text']
        elif 'question_text_variable' in question_data:
            question_text_var = question_data['question_text_variable']
            if question_text_var not in yaml_data['question_text_variables']:
                error("Question text variable not found in `question_text_variables`: %s" % question_text_var)
            question_text = yaml_data['question_text_variables'][question_text_var]
        else:
            error("Question is missing both `question_text` and `question_text_variable`: %s" % question_var)
        node_labels[question_var] = question_text
        for option in question_data['answers']:
            option_text = option['answer_text']
            if 'outcome' in option:
                num_outcomes += 1
                destination_type = 'outcome'
                destination_var = '%s_%d' % (DUMMY_OUTCOME_PREFIX, num_outcomes)
                node_labels[destination_var] = option['outcome']
            elif 'question_variable' in option:
                destination_type = 'question_variable'
                destination_var = option['question_variable']
            else:
                error("Option `%s` is missing both `outcome` and `question_variable`: %s" % (option_text, question_var))
            edges[question_var].append((option_text, destination_type, destination_var))

    # build graph in DOT language
    print("digraph G {")
    print("  // nodes")
    for var, label in sorted(node_labels.items(), key=lambda x: x[0]):
        node_params = ''
        if var.startswith(DUMMY_OUTCOME_PREFIX + '_'):
            node_params += ', color=red, fontcolor=red'
        print('  %s [label="%s"%s];' % (var, label, node_params))
    print()
    print("  // edges")
    for var, outgoing in sorted(edges.items(), key=lambda x: x[0]):
        for option_text, destination_type, destination_var in outgoing:
            print('  %s -> %s [label="%s"];' % (var, destination_var, option_text))
    print("}")

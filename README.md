A self-placement site for students to decide which introductory CSE course to take at UCSD. Inspired by the CSE 12X Self-Placement survey created by the CS department at University of Washington!

### Roadmap
- [ ] Add back button functionality
- [ ] Add hyperlink capability in the config YAML file
- [ ] Add LinkML / JSON Schema validation
- [ ] Add Playwright E2E tests

### Potential future features
- [ ] Add feature to save answers to local storage
- [ ] Support previous question response logic in the config YAML file
- [ ] Permit rich text formatting in the YAML file
- [ ] Add support for an external file for code snippets that can be imported into the YAML file (easier development and testing of the code snippets)

### Development

#### Config file notes 
- `subquestions_logic` must be included for subquestions to be evaluated and must be 2-space indented

#### Config file visualization
- Run `python scripts/visualize.py <path_to_config.yaml>` to visualize the config file
- The output will be saved as DOT file, which can then be visualized in any DOT graph visualization tool, such as https://dreampuf.github.io/GraphvizOnline

#### Live development
- Install Node.js and npm [here](https://nodejs.org/en/download)
- Clone the repository and run `npm install`
- Run `npm run dev` to start the development server
- Modify the `public/config.yaml` file to change the questions and logic
- Reload the page to see changes
var jsPsychAdaptiveHierarchy = (function (jspsych) {

    const info = {
        name: 'hierarchical-categorization',
        description: "Code for hierarchical categorization task.", 
        version: "1.0.0", 
        parameters: {
            start_tree: {
                type: jspsych.ParameterType.OBJECT,
                default: void 0,
                description: "The starting category system."
            },
            items: {
                type: jspsych.ParameterType.ARRAY,
                arrayType: jspsych.ParameterType.INT,
                default: [],
                description: 'The list of items to be categorized.'
            },
            item_loc: {
                type: jspsych.ParameterType.STRING,
                default: void 0, 
                description: 'The folder that contains the stimuli used for the task'
            },
            title: {
                type: jspsych.ParameterType.HTML_STRING,
                default: "Alien Organisms",
                description: "The title of the task."
            },
            depth: {
                type: jspsych.ParameterType.INT,
                default: void 0,
                description: "The level at which items are added to the graph."
            },
            prompts: {type: jspsych.ParameterType.ARRAY,
                arrayType: jspsych.ParameterType.HTML_STRING,
                default: [],
                description: "The prompts to display to participants as they complete the trial."
            },
            button_labels: {type: jspsych.ParameterType.ARRAY,
                arrayType: jspsych.ParameterType.STRING,
                default: [],
                description: 'The text that will appear on the next button during the experiment.'
            },
            background_color: {
                type: jspsych.ParameterType.STRING,
                default: "lightblue",
                description: "The background color of the canvas."
            },
            node_background_color: {
                type: jspsych.ParameterType.STRING,
                default: "white",
                description: "The background color of the nodes."
            },
            node_border_width: {
                type: jspsych.ParameterType.INT,
                default: 2,
                description: "The width of the line for the border of the nodes and the links."
            },
            min_width_gap: {
                type: jspsych.ParameterType.INT,
                default: 0.015,
                description: "The minimum gap size between nodes (calculated as a proportion of the total space)."
            },
            min_height_gap: {
                type: jspsych.ParameterType.INT,
                default: 0.05,
                description: "The minimum gap size between nodes (calculated as a proportion of the total space)."
            },
            start_idx: {
                type: jspsych.ParameterType.INT,
                default: -1,
                description: "How many prompts there are at the start."
            }
        },
        data: {
            rts: {
                type: jspsych.ParameterType.ARRAY,
                arrayType: jspsych.ParameterType.INT,
                default: [],
                description: 'The response time in milliseconds.'
            },
            final_tree: {
                type: jspsych.ParameterType.OBJECT,
                default: void 0,
                description: 'The final category system that the participant ends the task with.'
            },
            category_choices: {
                type: jspsych.ParameterType.ARRAY,
                arrayType: jspsych.ParameterType.STRING,
                default: [],
                description: 'The locations a participant placed each new item into the hierarchy.'
            },
            category_changes: {
                type: jspsych.ParameterType.ARRAY,
                arrayType: jspsych.ParameterType.ARRAY,
                default: [],
                description: 'The previous choices before the final category choice.'
            }
        }
    };
    /**
     * **adaptive-hierarchy**
     *
     * {description}
     *
     * @author Katie Warburton
     * @see {@link {documentation-url}}
     */
    class AdaptiveHierarchy {
        constructor (jsPsych) {
            this.jsPsych = jsPsych;
        }
        static info = info;    
        trial(display_element, trial) {
            // modify css so that scrollbars are pink
            let css = ".jspsych-display-element {scrollbar-color: black white;}";
            css += "body {background-color: white;}";

            let style = document.createElement('style');
            style.innerHTML = css;
            document.head.appendChild(style);
            console.log(trial.items, trial.data.condition);

            // Define the base HTML for the trial
            let html = '';
            html += '<div class ="jspsych-display-element" style="display: grid; grid-template-columns: 6fr 79fr 1fr 8fr 6fr; grid-template-rows: 2fr 5fr 1fr 11fr 2fr 73fr 1fr 5fr 1fr; height: 96vh; width: 96vw; margin: auto; padding: 0;">';
            html += '<div id="title-container" style="grid-row: 2; grid-column: 2; text-align: left; display:flex; align-items: center; height: 100%; width: 100%;">';
            html += '<div style="font-size: 5vh;">'+trial.title+"</div>";
            html += '</div>';
            html += '<div id="item-display" style="grid-row: 2 / span 3; grid-column: 4; text-align: center; display:flex; align-items: center; justify-content: center; border: 3px solid black; width: 100%; height: 100%; font-size: 1.75vh;">';
            
            html += '</div>';
            html += '<div id="prompt-container" style="grid-row: 4; grid-column: 2; text-align: left; display:flex; align-items: top; height: 100%; width: 100%; overflow: auto; line-height:1.25em;">';
            html +=  trial.prompts[0];
            html += '</div>';
            html += '<svg id="category-tree" style="grid-row: 6;  grid-column: 2 / span 3;  width:100%; height:100%; border:3px solid black; background-color:'+trial.background_color+';">'
            html += '</svg>';
            html += '<div id="button-container" style="grid-row: 8; grid-column: 2 / span 3; text-align: center; display:flex; align-items: center; justify-content: center; height: 100%; width: 100%;">';
            html += '<button class="trial-button" id="continue-button" style="font-size:1.75vh;">'+trial.button_labels[0]+'</button>';
            html += '</div>';
            html +='</div>';
            display_element.innerHTML = html;

            let BUILD_MODE = false;
            let ITEM_LOC = null;

            // Define key functions for the code
            function get_node_info(tree) {
                let nodes_by_level = {};
                let nodes_by_name = {};
                function traverse(node, depth=0) {
                    if (node.root) {
                        node.parent = null;
                    }
                    if (!nodes_by_level[depth]) {
                        nodes_by_level[depth] = {'SIZE': 0, 'BIGGEST': 0};
                        };
                    node.index = nodes_by_level[depth]['SIZE'];
                    node.depth = depth;
                    nodes_by_level[depth]['SIZE'] += 1;
                    nodes_by_name[node.name] = node;
                    if (node.children.length !== 0) {
                        node.children.forEach(child => traverse(child, depth+1));
                        node.items = node.children.flatMap(child => child.items);
                        // assign current node as parent to children
                        node.children.forEach(child => child.parent = node);
                    }
                    if (node.items.length > nodes_by_level[depth]['BIGGEST'] ){
                        nodes_by_level[depth]['BIGGEST'] = node.items.length;
                    }
                }
                traverse(tree); 
            return nodes_by_level;
            }         

            // Define the function to get the best size for the items in the tree such that they fit into the space and have y rows and x columns. 
            function get_best_item_size(n, width, height) {
                let best_size = 0;
                let best_rows = 1;
                let best_cols = n;
                for (let rows = 1; rows <= n; rows++) {
                    let cols = Math.ceil(n / rows);
                    let item_width = (width-(2*trial.node_border_width)) / cols;
                    let item_height = (height - (2*trial.node_border_width))/ rows;
                    let item_size = Math.min(item_width, item_height);
                    if (item_size > best_size) {
                        best_size = item_size;
                        best_cols = cols;
                        best_rows = rows; 
                    }
                }
                return [best_size, best_rows, best_cols];
            }
            
            function get_rows(n, cols) {
                return Math.ceil(n/cols);
            }

            function get_cols(n, max_cols) {
                return Math.min(n, max_cols);
            }

            function get_node_boundaries(tree, category_box, nodes_by_level) {
                // get heights of nodes such that the height of a node is proportional to its depth in the tree
                let min_height_gap = trial.min_height_gap * category_box.height;
                const available_height = category_box.height - (min_height_gap * (trial.depth+1));
                let numerators = Array.from({length: trial.depth}, (_, i) => i+1);
                const denominator = numerators.reduce((a, b) => a+b, 0);
                let node_heights = numerators.map(n => n/denominator * available_height);
                console.log(denominator);

                // get widths of nodes such that the width is proportional to the number of nodes at that level
                let min_width_gap = trial.min_width_gap * category_box.width;
                let stats_by_level = {};
                let sizes = [];
                for (let level in nodes_by_level) {
                    let num_nodes = nodes_by_level[level]['SIZE'];
                    let available_width = category_box.width - (min_width_gap * (num_nodes+1));
                    let width = available_width/num_nodes;
                    let height = node_heights[level];
                    let most_in_node = nodes_by_level[level]['BIGGEST'] + trial.items.length;
                    let [size, rows, cols] = get_best_item_size(most_in_node, width, height);
                    stats_by_level[level] = [width, height, rows, cols];
                    sizes.push(size);

                }
                let item_size = Math.min(...sizes);

                function traverse(node) {
                    let level = node.depth;
                    let index = node.index;
                    let [width, height, rows, cols]= stats_by_level[level];
                    node.max_width = width;
                    node.max_height = height;
                    node.item_size = item_size;
                    node.rows = rows;
                    node.cols = cols;
                    node.y = min_height_gap + (node_heights.slice(0, level).reduce((a, b) => a+b, 0) + (min_height_gap * level));
                    node.min_x = min_width_gap + (width+ min_width_gap) * index;
                    node.center_x = node.min_x + width/2;
                    node.max_x = node.center_x + width/2;
                    node.width = (2*trial.node_border_width) + (node.item_size * get_cols(node.items.length, node.cols));
                    node.height = (2*trial.node_border_width) + (node.item_size * get_rows(node.items.length, node.cols));
                    if (node.children.length !== 0) {
                        node.children.forEach(child => traverse(child));
                    }
                }
                traverse(tree);
            }

            function calculate_link_xy (source, target) {
                let source_x = source.data.center_x;
                let source_y = source.data.y + source.data.height;
                let target_x = target.data.center_x;
                let target_y = target.data.y;
                let xy_string = "M" + source_x + "," + source_y + " " + target_x + "," + target_y;
                return xy_string;
            }

            function get_x_edge(node) {
                let x_edge = node.center_x - (node.width/2);
                return x_edge;
            }

            function redraw_node(rect, node, d) {
                d.data.items.push(trial.items[current_item]);
                let loc = d.data.items.length - 1;
                let x = trial.node_border_width + ((loc % d.data.cols) * d.data.item_size);
                let y = trial.node_border_width + (Math.floor(loc / d.data.cols) * d.data.item_size);

                let item_path =  trial.item_loc + "\item (" + trial.items[current_item] + ").png";
                node.append("image")
                .attr("xlink:href", item_path)
                .attr("x", x)
                .attr("y", y)
                .attr("width", d.data.item_size)
                .attr("height", d.data.item_size)
                .attr("pointer-events", "none")
                .attr('visibility', 'visible');


                d.data.width = (2*trial.node_border_width) + (d.data.item_size * get_cols(d.data.items.length, d.data.cols));
                d.data.height = (2*trial.node_border_width) + (d.data.item_size * get_rows(d.data.items.length, d.data.cols));

                // redraw rectangle
                rect.attr("width", d => d.data.width)
                .attr("height", d => d.data.height);
                // empty the item display
                let item_display = document.getElementById("item-display");
                item_display.innerHTML = '';

                // might need to fix this for removal??
                if (d.data.items.length  < d.data.cols+1) {

                    node.attr("transform", d => "translate(" + get_x_edge(d.data) + "," + d.data.y + ")");
                        // shift the circle so its centered
                    node.select("circle")
                    .attr("cx", d.data.width/2);
                }
            }

            function remove_item(rect, node, d) {
                // get index of item
                d.data.items.pop();
                let loc = d.data.items.length;
                node.selectAll("image").filter(function(d, i) {return i == loc;}).remove();
                if (loc === 0) {
                    // make text visible
                    let text = node.select("text");
                    text.attr("visibility", "visible");
                    d.data.visible = false;

                    // make circle invisible
                    let circle = node.select("circle");
                    circle.attr("visibility", "hidden");

                    // make rectangle invisible
                    rect.attr("visibility", "hidden");

                    // make link between node and parent invisible
                    let parent = d.parent;
                    let link = d3.selectAll(".link").filter(function(l) {return l.source === parent && l.target === d;});
                    link.attr("visibility", "hidden");
  

                } else {
                    d.data.width = (2*trial.node_border_width) + (d.data.item_size * get_cols(d.data.items.length, d.data.cols));
                    d.data.height = (2*trial.node_border_width) + (d.data.item_size * get_rows(d.data.items.length, d.data.cols));

                    // redraw rectangle
                    rect.attr("width", d => d.data.width)
                    .attr("height", d => d.data.height);

                    // remove only the last image from the node

                    if (d.data.items.length  < d.data.cols) {
                        node.attr("transform", d => "translate(" + get_x_edge(d.data) + "," + d.data.y + ")");
                        node.select("circle")
                        .attr("cx", d.data.width/2);
                    }
                }
            }

            function redraw_links(svg) {
                let links = svg.selectAll(".link");
                links.each(function(d) {
                    let link = d3.select(this);
                    let xy_string = calculate_link_xy(d.source, d.target);
                    link.attr("d", xy_string);
                });
            }

            function create_category_node (d, node) {
                node.append("rect")
                .attr("depth", d => d.data.depth)
                .attr("width", d => d.data.width)
                .attr("height", d => d.data.height)
                .attr("fill", trial.node_background_color)
                .attr("stroke", "black")
                .attr("rx", trial.node_border_width)
                .attr("stroke-width", trial.node_border_width)
                .attr("visibility", d => d.data.visible ? "visible" : "hidden")
                .style("cursor", d => d.data.depth == trial.depth-1 ? "pointer" : "default")
                .on("mouseover", function() {
                    if (d.data.depth == trial.depth-1 ){
                        d3.select(this).attr("stroke", "red");
                        d3.select(this).attr("stroke-width", trial.node_border_width*2);

                    }
                })
                .on("mouseout", function() {
                    d3.select(this).attr("stroke", "black");
                    d3.select(this).attr("stroke-width", trial.node_border_width);
                })
                .on("click", function() {
                    if (d.data.depth == trial.depth-1 && BUILD_MODE && ITEM_LOC === null) {
                        // redefine width and height of node
                        let rect = d3.select(this)
                        redraw_node(rect, node, d);

                        // Update parent nodes and visual elements
                        let parent = d.parent;
                        while (parent) {
                            let prev_rows = get_rows(parent.data.items.length, parent.data.cols);
                            let parentNode = d3.select(`g[name="${parent.data.name}"]`);
                            let parentRect = parentNode.select("rect");
                            redraw_node(parentRect, parentNode, parent);
                            let curr_rows = get_rows(parent.data.items.length, parent.data.cols);
                            // if the node rows increase, I want to shift the links down
                            if (prev_rows != curr_rows) {
                                // update existing links
                                redraw_links(svg);
      
                            }
                            parent = parent.parent;
                        }
                        ITEM_LOC = d.data.name;
                        NEXT_BUTTON.disabled = false;

                    } else if (d.data.depth == trial.depth-1 && BUILD_MODE && ITEM_LOC !== null && ITEM_LOC !== d.data.name) {
                        let rect = d3.select(this);
                        // add item to new node
                        // remove item from current_node and add to new node
                        let old_node = d3.select(`g[name="${ITEM_LOC}"]`);
                        let old_rect = old_node.select("rect");
                        let old_d = NODES_BY_NAME[ITEM_LOC];
                        remove_item(old_rect, old_node, old_d);
                        let old_parent = old_d.parent;
                        while (!old_parent.data.root) {
                            let prev_rows = get_rows(old_parent.data.items.length, old_parent.data.cols);
                            let parent_rect = d3.select(`g[name="${old_parent.data.name}"]`).select("rect");
                            let parent_node = d3.select(`g[name="${old_parent.data.name}"]`);
                            remove_item(parent_rect, parent_node, old_parent);
                            let curr_rows = get_rows(old_parent.data.items.length, old_parent.data.cols);  
                            if (prev_rows != curr_rows) {
                                // update existing links
                                redraw_links(svg);
                            } 
                            old_parent = old_parent.parent

                        }
                        redraw_node(rect, node, d);
                        let parent = d.parent;
                        while (!parent.data.root) {
                            let prev_rows = get_rows(parent.data.items.length, parent.data.cols);
                            let parent_rect = d3.select(`g[name="${parent.data.name}"]`).select("rect");
                            let parent_node = d3.select(`g[name="${parent.data.name}"]`);
                            redraw_node(parent_rect, parent_node, parent);
                            let curr_rows = get_rows(parent.data.items.length, parent.data.cols);
                            if (prev_rows != curr_rows) {
                                // update existing links
                                redraw_links(svg);
                            }
                            parent = parent.parent;
                        }
                        ITEM_CHOICES.push(ITEM_LOC);
                        ITEM_LOC = d.data.name;
                    }
                })
                ;

                let i = 0;
                for (let row = 0; row < d.data.rows; row++) {
                    for (let col = 0; col < d.data.cols; col++) {
                        if (i < d.data.items.length) {
                            let item = d.data.items[i];
                            let item_path =  trial.item_loc + "\item (" + item + ").png";
                            let x = trial.node_border_width + (col * d.data.item_size);
                            let y = trial.node_border_width + (row * d.data.item_size);
                            node.append("image")
                            .attr("xlink:href", item_path)
                            .attr("x", x)
                            .attr("y", y)
                            .attr("width", d.data.item_size)
                            .attr("height", d.data.item_size)
                            .attr("pointer-events", "none");
                            i++;
                        }
                    }
                }

                node.append("text")
                .text(d => 'ADD CATEGORY')
                .attr("text-anchor", "middle")
                .attr("alignment-baseline", "hanging")
                // make bold
                .attr("font-weight", "bold")
                .attr("font-size", function(d) {
                    let width = d.data.max_width - (2*trial.node_border_width);
                    let height = d.data.max_height - (2*trial.node_border_width);
                    let text = d3.select(this);
                    let size = 0;
                    let text_width = 0;
                    let text_height = 0;
                    while (text_width < (width/2) && text_height < (height/2)) {
                        size += 1;
                        text.style("font-size", size + "px");
                        text_width = text.node().getBBox().width;
                        text_height = text.node().getBBox().height;
                    }                        
                    return size + "px";
                })
                .attr("fill", "black")
                .attr("visibility", d => !d.data.visible ? "visible" : "hidden")
                .style("cursor", "pointer")
                .on("mouseover", function() {
                    d3.select(this).attr("fill", "red");
                })
                .on("mouseout", function() {
                    d3.select(this).attr("fill", "black");
                })
                .on("click", function() {
                    // make text invisible
                    if (BUILD_MODE && ITEM_LOC === null) {
                        let text = d3.select(this);
                        text.attr("visibility", "hidden");
                        d.data.visible = true;
                        // make circle visible
                        let circle = node.select("circle");
                        circle.attr("visibility", "visible");
                        // make rectangle visible
                        let rect = node.select("rect");
                        rect.attr("visibility", "visible");
                        // add image to node
                        redraw_node(rect, node, d);
                        // make link between node and parent visible
                        let parent = d.parent;
                        let link = svg.selectAll(".link").filter(function(l) {return l.source === parent && l.target === d;});
                        link.attr("visibility", "visible");

                        // Update parent nodes and visual elements
                        while (parent) {
                            let prev_rows = get_rows(parent.data.items.length, parent.data.cols);
                            let parent_rect = d3.select(`g[name="${parent.data.name}"]`).select("rect");
                            let parent_node = d3.select(`g[name="${parent.data.name}"]`);
                            redraw_node(parent_rect, parent_node, parent);
                            let curr_rows = get_rows(parent.data.items.length, parent.data.cols);
                            if (prev_rows != curr_rows) {
                                // update existing links
                                redraw_links(svg);
                            }
                            parent = parent.parent;
                        }
                        ITEM_LOC = d.data.name;
                        NEXT_BUTTON.disabled = false;

                    } else if (BUILD_MODE && ITEM_LOC !== null && ITEM_LOC !== d.data.name) {
                        let text = d3.select(this);
                        text.attr("visibility", "hidden");
                        d.data.visible = true;
                        // make circle visible
                        let circle = node.select("circle");
                        circle.attr("visibility", "visible");
                        // make rectangle visible
                        let rect = node.select("rect");
                        rect.attr("visibility", "visible");
                        // add image to node
                        redraw_node(rect, node, d);
                        // make link between node and parent visible
                        let parent = d.parent;
                        let link = svg.selectAll(".link").filter(function(l) {return l.source === parent && l.target === d;});
                        link.attr("visibility", "visible");
                        // remove item from previous node
                        let old_node = d3.select(`g[name="${ITEM_LOC}"]`);
                        let old_rect = old_node.select("rect");
                        let old_d = NODES_BY_NAME[ITEM_LOC];
                        remove_item(old_rect, old_node, old_d);
                        let old_parent = old_d.parent;
                        while (!old_parent.data.root) {
                            let prev_rows = get_rows(old_parent.data.items.length, old_parent.data.cols);
                            let parent_rect = d3.select(`g[name="${old_parent.data.name}"]`).select("rect");
                            let parent_node = d3.select(`g[name="${old_parent.data.name}"]`);
                            remove_item(parent_rect, parent_node, old_parent);
                            let curr_rows = get_rows(old_parent.data.items.length, old_parent.data.cols);  
                            if (prev_rows != curr_rows) {
                                // update existing links
                                redraw_links(svg);
                            } 
                            old_parent = old_parent.parent

                        }
                        // Update parent nodes and visual elements
                        while (!parent.data.root) {
                            let prev_rows = get_rows(parent.data.items.length, parent.data.cols);
                            let parent_rect = d3.select(`g[name="${parent.data.name}"]`).select("rect");
                            let parent_node = d3.select(`g[name="${parent.data.name}"]`);
                            redraw_node(parent_rect, parent_node, parent);
                            let curr_rows = get_rows(parent.data.items.length, parent.data.cols);
                            if (prev_rows != curr_rows) {
                                // update existing links
                                redraw_links(svg);
                            }
                            parent = parent.parent;
                        }
                        ITEM_CHOICES.push(ITEM_LOC);
                        ITEM_LOC = d.data.name;
                    }
                });

                node.append("circle")
                .attr("cx", d.data.width/2)
                .attr("r", trial.node_border_width*2)
                .attr("fill", "black")
                .attr("visibility", d => (d.data.visible && !d.data.root)? "visible" : "hidden");


            }

            let category_tree = document.getElementById("category-tree");
            let category_tree_box = category_tree.getBoundingClientRect();
        
            let tree = trial.start_tree;
            let NODES_BY_LEVEL = get_node_info(tree);
            get_node_boundaries(tree, category_tree_box, NODES_BY_LEVEL);


            let svg = d3.select("#category-tree")            
            let g = svg.append("g");
            let root = d3.hierarchy(tree);
            let treeLayout = d3.tree();
            treeLayout(root);
            let nodes = root.descendants();
            let links = root.links();

            let node = g.selectAll(".node")
            .data(nodes)
            .enter()
            .append("g")
            .attr("class", "node")
            .attr('name', d => d.data.name)
            .attr("transform", d => "translate(" + get_x_edge(d.data) + "," + d.data.y + ")");

            let NODES_BY_NAME = {};
            nodes.forEach(node => {
                NODES_BY_NAME[node.data.name] = node;
            });

            node.each(function(d) {
                let node = d3.select(this);
                create_category_node(d, node);
              
            });

            svg.selectAll(".link")
            .data(links)
            .enter()
            .append("path")
            .attr("class", "link")
            .attr("d", d => calculate_link_xy(d.source, d.target))
            .attr("fill", "none")
            .attr("stroke", "black")
            .attr("stroke-width", trial.node_border_width)
            .attr("visibility", d => d.source.data.visible && d.target.data.visible ? "visible" : "hidden")
            .lower();


            function clearItems(node) {
                if (node.children.length !== 0) {
                    node.items = [];
                }
                delete node.depth;
                delete node.width;
                delete node.item_size;
                delete node.height;
                delete node.max_height;
                delete node.max_width;
                delete node.cols;
                delete node.rows;
                delete node.max_x;
                delete node.center_x;
                delete node.min_x;
                delete node.y; 
                node.children.forEach(child => {
                    clearItems(child);
                });
            }

            function showElement(index) {
                if (index < 0) {
                    let prompt = document.getElementById("prompt-container");
                    if (index < trial.prompts.length-1) {
                        prompt.innerHTML = trial.prompts[index+Math.abs(trial.start_idx)];
                        NEXT_BUTTON.textContent = trial.button_labels[index+Math.abs(trial.start_idx)];
                    } else {
                        prompt.innerHTML = '';
                    }
                    NEXT_BUTTON.textContent = trial.button_labels[index+Math.abs(trial.start_idx)];
                } else if (index < trial.items.length) {
                    ITEM_CHOICES = [];
                    let item_display = document.getElementById("item-display");
                    item_display.innerHTML = '';
                    const image_element = document.createElement('img');
                    image_element.src = trial.item_loc + "\item (" + trial.items[index] + ").png";
                    image_element.id = `stimuli-${index}`;
                    let size = Math.min(item_display.clientWidth, item_display.clientHeight);
                    image_element.width = size;
                    image_element.height = size;
                    image_element.className = 'stimuli';
                    image_element.addEventListener('load', () => {
                        item_display.appendChild(image_element);
                    });
                    BUILD_MODE = true;
                    let prompt = document.getElementById("prompt-container");
                    if (index < trial.prompts.length-1) {
                        prompt.innerHTML = trial.prompts[index+Math.abs(trial.start_idx)];
                        NEXT_BUTTON.textContent = trial.button_labels[index+Math.abs(trial.start_idx)];
                    } else {
                        prompt.innerHTML = '';
                    }
                    NEXT_BUTTON.textContent = trial.button_labels[index+Math.abs(trial.start_idx)];
                    NEXT_BUTTON.disabled = true;
                } else {
                    BUILD_MODE = false;
                    // ensures that the final tree does not have any circular references
                    for (let node of nodes) {
                        delete node.data.parent;

                    }
                    let final_tree = root.data;
                    clearItems(final_tree);

                    console.log(REACTION_TIMES);
                    console.log(CATEGORY_CHOICES);
                    console.log(CATEGORY_CHANGES);

                    let data = {
                        rts: REACTION_TIMES,
                        final_tree: final_tree,
                        category_choices: CATEGORY_CHOICES
                    };
                    jsPsych.finishTrial(data);
                }   
                TIME = performance.now();
            }

            let current_item = trial.start_idx;
            let ITEM_CHOICES;
            let REACTION_TIMES = [];
            let CATEGORY_CHOICES = [];
            let CATEGORY_CHANGES = [];
            let TIME = performance.now();
            let NEXT_BUTTON = document.getElementById("continue-button");
            NEXT_BUTTON.addEventListener("click", function() {
                REACTION_TIMES.push(performance.now() - TIME);
                if (current_item > -1 ){
                    CATEGORY_CHOICES.push(ITEM_LOC);
                    CATEGORY_CHANGES.push(ITEM_CHOICES);
                }
                current_item++;
                ITEM_LOC = null;
                document.getElementById("prompt-container").scrollTop = 0;
                showElement(current_item);
            });
        }
    }
    AdaptiveHierarchy.info = info;
    return AdaptiveHierarchy;

})(jsPsychModule);
import { Fragment, useEffect, useState } from "react";
import "./Form.css";
import { Form, Formik } from "formik";
import formJSON from "../../utils/formJson.json";
import { TextField, Button } from "@mui/material";
function NewForm() {
	const [formikProps, setFmProps] = useState({
		validateOnMount: true,
		initialValues: {},
	});
	const [formjson, setFormJson] = useState(formJSON);
	const [activeTree, setActiveTree] = useState(null);
	const [formLoaded, setFormLoaded] = useState(false);

	const isIgnored = (key) => {
		return key === 'next' || key === 'prev'
	}
	const getFormEssentials = (parent) => {
		let initialValues = {};

		function generateEssentials(parent) {
			Object.entries(parent).map(([key, children]) => {
				if (typeof children === "object" && !isIgnored(key)) {
					if (children.questions != undefined) {
						Object.values(children.questions).map((field: any) => {
							if (field.type === "checkbox" || field.type === "checkboxes") {
								initialValues[field.key] = [];
							} else {
								initialValues[field.key] = field.value ? field.value : "";
							}
						});
					} else {
						generateEssentials(children);
					}
				}
			});
		}

		generateEssentials(parent);
		return { initialValues };
	};

	const buildNavigationReferences = (parent : any) => {
		let prev = null;
		Object.entries(parent).map(([key, children]) => {
			if (typeof children === "object" && !isIgnored(key)) {
				if(prev === null){
					Object.defineProperties(children, {
						next: {
							value: null,
							writable: true,
						},
						prev: {
							value: null,
							writable: true,
						},
					});
					prev = children;
				} else {
					// assign prev and next nodes to current children
					if (
						children.hasOwnProperty("next") &&
						children.hasOwnProperty("prev")
					){
							children.next = null;
							children.prev = prev;
					} else{
						Object.defineProperties(children, {
							next: {
								value: null,
								writable: true,
							},
							prev: {
								value: prev,
								writable: true,
							},
						});
					}
					
					// assign prev and next nodes to prev children
					prev.next = children;
				}
				if (children.questions != undefined) {
					children.next = null;
				} else {
					buildNavigationReferences(children);
				}
				prev = children;
			}
		})
	}


	const componentMounted = () => {
		setFormJson(formJSON);
		let formjson = formJSON;
		buildNavigationReferences(formjson);
		let { initialValues } = getFormEssentials(formjson);
		setFmProps((oldState) => {
			return { ...oldState, initialValues: initialValues };
		});
		let activeTreeCopy = {};
		let index = 0;
		function iterateTillQuestions(parent) {
			for (const [key, value] of Object.entries(parent)) {
				if (typeof value === "object" && !isIgnored(key)) {
					if (value.questions === undefined) {
						activeTreeCopy[value.depth] = value;
						iterateTillQuestions(value);
						break;
					} else {
						activeTreeCopy[value.depth] = value;
						break;
					}
				}
			}
		}
		iterateTillQuestions(formjson);
		// let activeTreeEntries = Object.fromEntries(activeTreeCopy);;
		setActiveTree(activeTreeCopy);
		console.log("activeTree", activeTreeCopy);
		setFormLoaded(true);
	};

	useEffect(componentMounted, []);

	const renderSidebar = (parent: any, fmProps: any) => {
		const active =
			activeTree &&
			activeTree[parent.depth] != undefined &&
			activeTree[parent.depth]['key'] === parent['key']
				? true
				: false;
		return (
			<Fragment>
				{parent.title && (
					<li className={active ? "active-li" : ""}>{parent.title}</li>
				)}
				{Object.entries(parent).map(([key, children]) => {
					if (typeof children === "object" && !isIgnored(key)) {
						if (children.questions != undefined) {
							const active =
								activeTree &&
								activeTree[children.depth] != undefined &&
								activeTree[children.depth]["key"] === children["key"]
									? true
									: false;
							return (
								<li className={active ? "active-li" : ""} key={children.key}>
									{children.title}
								</li>
							);
						} else {
							return (
								<ul className="children-list">
									{renderSidebar(children, fmProps)}
								</ul>
							);
						}
					}
				})}
			</Fragment>
		);
	};

	const renderFormContent = (parent: any, fmProps: any) => {
		return (
			<div className={"active-section"}>
				
				{Object.entries(parent).map(([key, children]) => {
					if (typeof children === "object" && !isIgnored(key)) {
						if (children.questions != undefined && activeTree[children.depth].key === children.key) {
							return (
								<Fragment>
									<p>{parent.title}</p>
									<p>{children.title}</p>

									{Object.values(children.questions).map((field: any) => {
										const fieldType = field.type;
										const commonProps = {
											label: field.title,
											key: field.key,
											value: fmProps.values[field.key],
										};
										switch (fieldType) {
											case "textfield":
												return (
													<TextField
														{...commonProps}
														className="form-fields"
														InputProps={{ classes: { root: "form-fields" } }}
													/>
												);
											default:
												return null;
										}
									})}

									<Button onClick={() => gotoPrev()}>Back</Button>
									<Button onClick={() => gotoNext()}>Next</Button>
								</Fragment>
							);
						} else {
							return <ul>{renderFormContent(children, fmProps)}</ul>;
						}
					}
				})}
			</div>
		);
	};

	const gotoPrev = () => {
		console.log("prev called");
	};

	const gotoNext = () => {
		console.log("next called");
		let entries = Object.entries(activeTree);
		let treeClone = {...activeTree};
		let currentActiveItem = entries[entries.length - 1][1];
		/**
		 * CASES - 
		 * 1. Next node present for the last item item in the activeTree, set as active
		 * 2. No next node present
		 * - 2.1. backtrack to one level up in activeTree
		 * -----2.1.1. next node is present, iterate till 'questions' depth & set that node as active
		 * -----2.2.2. no next node, Repeat 2.1.		
		 */

		function iterateTillQuestions(node, tree){
			tree[node.depth] = node;
			for (const [key,value] of Object.entries(node)) {
				if(typeof value === 'object'){
					tree[value.depth] = value;
					if(value.hasOwnProperty('questions')){
						// entries.push([node.depth, node]);
						return true;
					} else {
						iterateTillQuestions(value, tree);
					}
				}
			}
		}

		if (currentActiveItem.next) {
			treeClone[currentActiveItem.next.depth] = currentActiveItem.next;
		} else {
			delete treeClone[currentActiveItem.depth];
			// entriesClone.splice(entriesClone.length - 1, 1); //removing the last item, since it does not have the next node
			// backtracking
			let backTrack = () => {
				for (let index = entries.length - 1; index >= 0; index--) {
					let node = entries[index][1];
					if (node.next) {
						// if(node.next.depth !== node.depth){
						// 	// different levels found
						// 	treeClone = {};
						// }
						let gotTheQuestions = iterateTillQuestions(node.next, treeClone);
						if(gotTheQuestions) break;
					} else {
						delete treeClone[node.depth];
						// entriesClone.splice(index, 1); //removing the current item, since no next node
						// index--;
						continue;
					}
				}
			}
			backTrack();
		}
		console.log("active Tree - next", treeClone);
		setActiveTree(treeClone)
	};
	return (
		<div className="form-container">
			{formLoaded ? (
				<Formik {...formikProps}>
					{(fmProps: any) => {
						{
							console.log(fmProps);
						}
						return (
							<Form>
								<div className="form-inner-container">
									<div className="form-sidebar">
										{formjson && renderSidebar(formjson, fmProps)}
									</div>
									<div className="form-content">
										{formjson && renderFormContent(formjson, fmProps)}
									</div>
								</div>
							</Form>
						);
					}}
				</Formik>
			) : null}
		</div>
	);
}

export default NewForm;

import { graphql } from '$houdini';

export const afterLoad = async () => {
	return {};
};

const query = graphql`
	query Hello1 {
		hello
	}
`;

export const houdini_load = [query];

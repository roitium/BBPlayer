import { BaseToast, ErrorToast } from "react-native-toast-message";

export const toastConfig = {
	success: (props) => (
		<BaseToast {...props} text1NumberOfLines={0} text2NumberOfLines={0} />
	),
	error: (props) => (
		<ErrorToast {...props} text1NumberOfLines={0} text2NumberOfLines={0} />
	),
	info: (props) => (
		<BaseToast
			{...props}
			style={{ borderLeftColor: "#87CEFA" }} // Light Sky Blue for info
			text1NumberOfLines={0}
			text2NumberOfLines={0}
		/>
	),
};

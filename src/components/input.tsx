import { TextInput, StyleSheet, TextInputProps } from "react-native";

const styles = StyleSheet.create({

    input:{
    width: "100%",
    height: 48,
    borderWidth: 1,
    borderColor: "#DCDCDC",
    borderRadius: 15,
    fontSize: 16,
    paddingLeft: 12,
    color: "#000000",
    }

})

export function Input({...rest}: TextInputProps) {
    return (
        <TextInput style={styles.input} {...rest} />
    )
}

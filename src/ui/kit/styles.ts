import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    paddingBottom: 8,
    paddingTop: 8,
  },
  back: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  heading: {
    fontSize: 23,
    fontWeight: "700",
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 10,
    gap: 16,
    maxWidth: 640,
    width: "100%",
    alignSelf: "center",
    paddingBottom: 40,
  },
  card: {
    padding: 20,
    borderRadius: 18,
    gap: 14,
  },
  button: {
    width: "100%",
    minHeight: 46,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
  },
});

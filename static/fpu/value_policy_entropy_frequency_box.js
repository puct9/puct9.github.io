const load_value_policy_entropy_frequency_box = () => fetch("/static/fpu/value_policy_entropy_frequency_box.json")
.then(
    resp => resp.json()
)
.then(
    data => Plotly.newPlot("value-policy-entropy-frequency-box", data.data, data.layout)
)

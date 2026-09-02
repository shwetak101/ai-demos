import streamlit as st
import json

st.set_page_config(page_title='Power App Generator', layout='wide')

st.title('Natural Language to Power App Specification')

requirements = st.text_area('Enter business requirements', height=200)

if st.button('Generate Specification') and requirements:
    spec = {
        'app_name': 'Generated Power App',
        'description': requirements,
        'screens': ['Home', 'Data Entry', 'Review'],
        'data_sources': ['SharePoint List (placeholder)'],
        'automation': ['Power Automate workflow recommendation'],
        'generated_by': 'AI Demo'
    }
    st.subheader('Generated Specification')
    st.json(spec)
    st.download_button('Download JSON', json.dumps(spec, indent=2), file_name='power_app_spec.json')